#!/usr/bin/env python3
"""Check App Store metadata in the IPA before Codemagic publishes it."""

import json
import plistlib
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPO = json.loads((ROOT / "artifacts/train-xp/app.json").read_text())["expo"]
APP_PATH = "Payload/TrainXP.app/"
WIDGET_PATH = APP_PATH + "PlugIns/TrainXPWidgetExtension.appex/"
REQUIRED_KEYS = (
    "CFBundleDisplayName",
    "CFBundleExecutable",
    "CFBundleIdentifier",
    "CFBundleInfoDictionaryVersion",
    "CFBundleName",
    "CFBundlePackageType",
    "CFBundleShortVersionString",
    "CFBundleVersion",
)


def fail(message: str) -> None:
    raise SystemExit(f"Invalid IPA: {message}")


def read_plist(archive: zipfile.ZipFile, path: str) -> dict:
    try:
        return plistlib.loads(archive.read(path))
    except KeyError:
        fail(f"missing {path}")
    except (ValueError, plistlib.InvalidFileException) as error:
        fail(f"cannot read {path}: {error}")


def validate(ipa_path: Path) -> None:
    with zipfile.ZipFile(ipa_path) as archive:
        app = read_plist(archive, APP_PATH + "Info.plist")
        widget = read_plist(archive, WIDGET_PATH + "Info.plist")

        for key in REQUIRED_KEYS:
            value = widget.get(key)
            if not isinstance(value, str) or not value.strip() or "$(" in value:
                fail(f"widget {key} is missing or unresolved")

        expected_app_id = EXPO["ios"]["bundleIdentifier"]
        expected_widget_id = expected_app_id + ".widgets"
        if app.get("CFBundleIdentifier") != expected_app_id:
            fail("app bundle identifier does not match app.json")
        if widget["CFBundleIdentifier"] != expected_widget_id:
            fail("widget bundle identifier does not match app.json")

        for key, expected in (
            ("CFBundleShortVersionString", EXPO["version"]),
            ("CFBundleVersion", str(EXPO["ios"]["buildNumber"])),
        ):
            if app.get(key) != expected or widget[key] != expected:
                fail(f"app and widget {key} must both equal {expected}")

        extension = widget.get("NSExtension")
        if not isinstance(extension, dict) or extension.get(
            "NSExtensionPointIdentifier"
        ) != "com.apple.widgetkit-extension":
            fail("widget NSExtensionPointIdentifier is invalid")

        if WIDGET_PATH + widget["CFBundleExecutable"] not in archive.namelist():
            fail("widget executable is missing")

    print(f"IPA metadata OK: {ipa_path.name}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        fail("usage: validate-ios-ipa.py <path-to-ipa>")
    validate(Path(sys.argv[1]))
