"""Download and verify the pinned MediaPipe Pose Landmarker Lite task bundle."""

import hashlib
import time
from pathlib import Path
from urllib.request import urlopen

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
)
MODEL_SHA256 = "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a"
API_ROOT = Path(__file__).resolve().parents[1]
TARGET = API_ROOT / "models" / "pose_landmarker_lite.task"


def main() -> None:
    """Fetch to a temporary file and atomically place the completed bundle."""
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    temporary = TARGET.with_suffix(".task.download")
    for attempt in range(3):
        try:
            digest = hashlib.sha256()
            print(f"Downloading pinned MediaPipe model to {TARGET} (attempt {attempt + 1}/3)")
            with urlopen(MODEL_URL, timeout=60) as response, temporary.open("wb") as output:
                while chunk := response.read(1024 * 1024):
                    digest.update(chunk)
                    output.write(chunk)
            if digest.hexdigest() != MODEL_SHA256:
                raise RuntimeError("MediaPipe model SHA-256 mismatch")
            break
        except Exception:
            temporary.unlink(missing_ok=True)
            if attempt == 2:
                raise
            time.sleep(2**attempt)
    temporary.replace(TARGET)
    print(f"Verified: {TARGET.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
