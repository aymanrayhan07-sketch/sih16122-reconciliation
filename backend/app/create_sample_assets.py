import zlib
import struct
from pathlib import Path
from .config import UPLOADS_DIR

def make_png(width: int, height: int, r: int, g: int, b: int) -> bytes:
    """Generates a raw uncompressed PNG image without third party dependencies."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    raw_row = b"\x00" + bytes([r, g, b] * width)
    raw_data = raw_row * height
    idat = chunk(b"IDAT", zlib.compress(raw_data, 9))
    iend = chunk(b"IEND", b"")
    return header + ihdr + idat + iend

def generate_sample_evidence():
    samples = [
        ("spool_erection.jpg", 40, 100, 180),     # Steel Blue
        ("concrete_pedestal.jpg", 120, 120, 130), # Concrete Grey
        ("cable_pulling.jpg", 220, 140, 40),     # Electrical Amber
        ("drainage_trench.jpg", 140, 90, 50),    # Earth Brown
        ("transformer_pad.jpg", 90, 110, 120),   # Industrial Slate
        ("junction_box.jpg", 50, 130, 120),      # Cyan Green
        ("ndt_testing.jpg", 160, 60, 100),       # Magenta QC
        ("pipe_work.jpg", 80, 100, 140),         # Piping Navy
    ]
    for filename, r, g, b in samples:
        target = UPLOADS_DIR / filename
        if not target.exists():
            with open(target, "wb") as f:
                f.write(make_png(200, 150, r, g, b))

generate_sample_evidence()
