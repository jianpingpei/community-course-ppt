"""Apply inspected native template artwork to an authored editable PPTX.

Profiles describe inspected template files, not arbitrary decks.
Artwork, slide layouts, masters and their package dependencies are copied intact.
Teaching content and speaker notes remain editable native objects.
"""

import argparse
import copy
import json
import posixpath as pp
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as E

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
NS = {"p": P, "a": A, "r": R}
for prefix, uri in NS.items():
    E.register_namespace(prefix, uri)


def xml(e):
    return E.tostring(e, encoding="utf-8", xml_declaration=True)


def rel_path(part):
    return pp.join(pp.dirname(part), "_rels", pp.basename(part) + ".rels")


def resolve(part, target):
    return (
        target.lstrip("/")
        if target.startswith("/")
        else pp.normpath(pp.join(pp.dirname(part), target))
    )


def slide_parts(data):
    root = E.fromstring(data["ppt/presentation.xml"])
    rels = {
        e.get("Id"): e.get("Target")
        for e in E.fromstring(data["ppt/_rels/presentation.xml.rels"])
    }
    return [
        resolve("ppt/presentation.xml", rels[e.get("{" + R + "}id")])
        for e in root.findall("p:sldIdLst/p:sldId", NS)
    ]


def shape_text(shape):
    return "".join(t.text or "" for t in shape.findall(".//a:t", NS))


def rect(shape):
    xf = shape.find("p:spPr/a:xfrm", NS)
    if xf is None:
        xf = shape.find("p:xfrm", NS)
    if xf is None:
        xf = shape.find("p:grpSpPr/a:xfrm", NS)
    if xf is None:
        return None
    off, ext = xf.find("a:off", NS), xf.find("a:ext", NS)
    if off is None or ext is None:
        return None
    return tuple(
        int(v) / 914400
        for v in [off.get("x"), off.get("y"), ext.get("cx"), ext.get("cy")]
    )


def clear_template_text(root):
    for body in root.findall(".//p:txBody", NS):
        for child in list(body):
            if child.tag == "{" + A + "}p":
                body.remove(child)
        E.SubElement(body, "{" + A + "}p")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--template", required=True)
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--profile", required=True)
    args = ap.parse_args()
    profiles = json.loads(
        (
            Path(__file__).resolve().parent.parent / "assets/template-profiles.json"
        ).read_text("utf-8")
    )
    if args.profile not in profiles:
        raise ValueError("Unknown inspected template profile: " + args.profile)
    profile = profiles[args.profile]
    source, candidate, output = (
        Path(args.template).resolve(),
        Path(args.input).resolve(),
        Path(args.output).resolve(),
    )
    if output in (source, candidate):
        raise ValueError("Output must differ from both input files")
    with zipfile.ZipFile(source) as z:
        native = {n: z.read(n) for n in z.namelist()}
    with zipfile.ZipFile(candidate) as z:
        data = {n: z.read(n) for n in z.namelist()}
    native_types = E.fromstring(native["[Content_Types].xml"])
    types = E.fromstring(data["[Content_Types].xml"])
    content_types = {
        x.get("PartName", "").lstrip("/"): x.get("ContentType")
        for x in native_types
        if x.tag.endswith("Override")
    }
    defaults = {
        x.get("Extension"): x.get("ContentType")
        for x in native_types
        if x.tag.endswith("Default")
    }
    imported = {}

    def import_part(part):
        if part in imported:
            return imported[part]
        dest = "ppt/native-template/" + part
        imported[part] = dest
        data[dest] = native[part]
        mime = content_types.get(part) or defaults.get(pp.splitext(part)[1][1:])
        if mime:
            E.SubElement(
                types, "{" + CT + "}Override", PartName="/" + dest, ContentType=mime
            )
        relation = rel_path(part)
        if relation in native:
            rels = E.fromstring(native[relation])
            for entry in rels:
                if entry.get("TargetMode") == "External":
                    continue
                dependency = resolve(part, entry.get("Target"))
                if dependency not in native:
                    raise ValueError("Missing template dependency: " + dependency)
                target = import_part(dependency)
                entry.set("Target", pp.relpath(target, pp.dirname(dest)))
            data[rel_path(dest)] = xml(rels)
        return dest

    native_slides, slides = slide_parts(native), slide_parts(data)
    template_cover = native_slides[profile["coverSlide"] - 1]
    template_body = native_slides[profile["bodySlide"] - 1]
    replacements = {
        "167B71": profile["accent"],
        "16322D": profile["ink"],
        "E2EAE4": profile["secondary"],
        "F5F6F3": profile["background"],
    }
    for number, part in enumerate(slides):
        old = E.fromstring(data[part])
        oldtree = old.find("p:cSld/p:spTree", NS)
        original = template_cover if number == 0 else template_body
        fresh = E.fromstring(native[original])
        native_tree = fresh.find("p:cSld/p:spTree", NS)
        for shape in list(native_tree)[2:]:
            if any(x in shape_text(shape) for x in ["稻小壳", "稻壳家"]):
                native_tree.remove(shape)
        clear_template_text(fresh)
        # Preserve cover artwork. For body slides keep the native frame and leave
        # the teaching canvas free of the template's stock business diagrams.
        if number:
            for shape in list(native_tree)[2:]:
                box = rect(shape)
                if shape.tag == "{" + P + "}grpSp" or box is None or box[1] > 0.85:
                    native_tree.remove(shape)
        native_rel_root = E.fromstring(
            native.get(
                rel_path(original), b'<Relationships xmlns="' + REL.encode() + b'"/>'
            )
        )
        newrels = E.Element("{" + REL + "}Relationships")
        remap = {}
        for i, entry in enumerate(native_rel_root, 1):
            if entry.get("Type", "").endswith("/notesSlide"):
                continue
            copied = copy.deepcopy(entry)
            rid = "native" + str(i)
            remap[entry.get("Id")] = rid
            copied.set("Id", rid)
            if copied.get("TargetMode") != "External":
                target = import_part(resolve(original, copied.get("Target")))
                copied.set("Target", pp.relpath(target, pp.dirname(part)))
            newrels.append(copied)
        for node in fresh.iter():
            for attribute, value in list(node.attrib.items()):
                if attribute.startswith("{" + R + "}") and value in remap:
                    node.set(attribute, remap[value])
        oldrels = E.fromstring(data[rel_path(part)])
        for entry in oldrels:
            if not entry.get("Type", "").endswith("/slideLayout"):
                newrels.append(copy.deepcopy(entry))
        # Existing teaching objects retain their package relationships and notes.
        for shape in list(oldtree)[2:]:
            box = rect(shape)
            text = shape_text(shape)
            if not box:
                continue
            x, y, w, h = box
            if number:
                if (
                    not text and shape.tag != "{" + P + "}graphicFrame" and y < 1.5
                ) or (not text and h > 6):
                    continue
            else:
                # Keep the original template's graphical cover composition;
                # replace only the editable course title, subtitle and credit.
                if not text and shape.tag != "{" + P + "}pic":
                    continue
                xf = shape.find("p:spPr/a:xfrm", NS)
                if xf is not None and text:
                    off, ext = xf.find("a:off", NS), xf.find("a:ext", NS)
                    if y > 1 and y < 3:
                        off.set("x", str(profile["coverTitleX"]))
                        off.set("y", str(profile["coverTitleY"]))
                        ext.set("cx", str(profile["coverTitleWidth"]))
                        ext.set("cy", str(profile["coverTitleHeight"]))
                    elif y >= 3 and y < 5:
                        off.set("y", str(profile["coverSubtitleY"]))
                        ext.set("cy", "1000000")
            newshape = copy.deepcopy(shape)
            if profile.get("footerX"):
                xf = newshape.find("p:spPr/a:xfrm", NS)
                if xf is not None:
                    off, ext = xf.find("a:off", NS), xf.find("a:ext", NS)
                    if number == 0 and newshape.tag == "{" + P + "}pic":
                        off.set("x", "10058400")
                        off.set("y", "5303520")
                    elif number == 0 and "课程编制单位" in text:
                        off.set("x", "3200400")
                        off.set("y", "5394960")
                        ext.set("cx", "6400800")
                    elif number and y >= 6.5 and x < 2:
                        off.set("x", str(profile["footerX"]))
                        ext.set("cx", str(profile["footerWidth"]))
                        if y < 6.9 and len(text) > 90:
                            short = (
                                " · ".join(text.split(" · ")[:2]) + " 等（详见备注）"
                            )
                            runs = newshape.findall(".//a:t", NS)
                            for j, run in enumerate(runs):
                                run.text = short if j == 0 else ""
            for node in newshape.findall(".//a:srgbClr", NS):
                if node.get("val") in replacements:
                    node.set("val", replacements[node.get("val")])
            native_tree.append(newshape)
        # IDs in a slide must be unique after appending objects from another deck.
        for i, node in enumerate(fresh.findall(".//p:cNvPr", NS), 1):
            node.set("id", str(i))
        if len(fresh.findall(".//a:tbl", NS)) != len(old.findall(".//a:tbl", NS)):
            raise ValueError(f"Editable tables were lost on slide {number+1}")
        fresh.attrib.pop("show", None)
        for extension in list(fresh.findall("p:timing", NS)):
            fresh.remove(extension)
        data[part] = xml(fresh)
        data[rel_path(part)] = xml(newrels)
    # PowerPoint requires masters to be registered on the presentation as well
    # as reachable through each imported slide layout.
    presentation = E.fromstring(data["ppt/presentation.xml"])
    master_ids = presentation.find("p:sldMasterIdLst", NS)
    rels = E.fromstring(data["ppt/_rels/presentation.xml.rels"])
    for i, (part, dest) in enumerate(imported.items(), 1):
        if re.fullmatch(r"ppt/slideMasters/slideMaster\d+\.xml", part):
            rid = "nativeMaster" + str(i)
            E.SubElement(
                rels,
                "{" + REL + "}Relationship",
                Id=rid,
                Type=R + "/slideMaster",
                Target=pp.relpath(dest, "ppt"),
            )
            E.SubElement(
                master_ids,
                "{" + P + "}sldMasterId",
                {"id": str(2147500000 + i), "{" + R + "}id": rid},
            )
    data["ppt/presentation.xml"] = xml(presentation)
    data["ppt/_rels/presentation.xml.rels"] = xml(rels)
    data["[Content_Types].xml"] = xml(types)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as z:
        for name, payload in data.items():
            z.writestr(name, payload)
    print(
        json.dumps(
            {
                "file": str(output),
                "slides": len(slides),
                "template": str(source),
                "native_parts_copied": len(imported),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
