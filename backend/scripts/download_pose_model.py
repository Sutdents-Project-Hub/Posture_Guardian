"""Download the official MediaPipe Pose Landmarker Lite task bundle."""

from pathlib import Path
from urllib.request import urlopen

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
)
API_ROOT = Path(__file__).resolve().parents[1]
TARGET = API_ROOT / "models" / "pose_landmarker_lite.task"


def main() -> None:
    """Fetch to a temporary file and atomically place the completed bundle."""
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    temporary = TARGET.with_suffix(".task.download")
    print(f"Downloading official MediaPipe model to {TARGET}")
    with urlopen(MODEL_URL, timeout=60) as response, temporary.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
    temporary.replace(TARGET)
    print(f"Ready: {TARGET.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
