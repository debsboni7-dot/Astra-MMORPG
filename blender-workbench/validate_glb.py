#!/usr/bin/env python3
"""Structural validation for ASTREA's exported GLB asset (standard library only)."""
import json
import os
import struct
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "build/astrea-sword/astrea-ceremonial-sword.glb"
with open(path, "rb") as f:
    data = f.read()

if len(data) < 20:
    raise SystemExit("GLB validation failed: file is too small")
magic, version, declared_length = struct.unpack_from("<4sII", data, 0)
if magic != b"glTF" or version != 2 or declared_length != len(data):
    raise SystemExit("GLB validation failed: invalid header/version/declared length")

offset = 12
json_chunk = None
while offset + 8 <= len(data):
    chunk_length, chunk_type = struct.unpack_from("<I4s", data, offset)
    offset += 8
    chunk = data[offset:offset + chunk_length]
    if len(chunk) != chunk_length:
        raise SystemExit("GLB validation failed: truncated chunk")
    if chunk_type == b"JSON":
        json_chunk = chunk
    offset += chunk_length

if json_chunk is None:
    raise SystemExit("GLB validation failed: JSON chunk missing")
gltf = json.loads(json_chunk.decode("utf-8").rstrip(" \t\r\n\0"))
meshes = gltf.get("meshes", [])
nodes = gltf.get("nodes", [])
materials = gltf.get("materials", [])
accessors = gltf.get("accessors", [])

if len(meshes) < 10:
    raise SystemExit(f"GLB validation failed: expected >=10 mesh parts, got {len(meshes)}")
if not materials:
    raise SystemExit("GLB validation failed: no materials exported")
if not accessors or not any(a.get("type") == "VEC3" and a.get("count", 0) > 0 for a in accessors):
    raise SystemExit("GLB validation failed: no populated vertex-position accessors")

node_names = {n.get("name", "") for n in nodes}
required_names = [
    "ASTREA | Tapered steel blade",
    "Gold crossguard central boss",
    "Leather wrapped grip",
    "Pommel sapphire",
]
missing = [name for name in required_names if name not in node_names]
if missing:
    raise SystemExit("GLB validation failed: missing expected parts: " + ", ".join(missing))

print(json.dumps({
    "status": "validated",
    "format": "glTF Binary 2.0",
    "bytes": len(data),
    "mesh_parts": len(meshes),
    "materials": len(materials),
    "nodes": len(nodes),
    "required_parts": required_names,
}, indent=2))
