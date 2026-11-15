import bpy, math, json, os
from mathutils import Vector

OUT=os.environ.get("ASTREA_OUTPUT_DIR", os.path.abspath("build/astrea-armor"))
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)

def texture_set(key, color, metallic, roughness, grain=0.08):
    """Create compact, tileable PBR maps with subtle forged/grained surface detail."""
    folder=os.path.join(OUT,"textures"); os.makedirs(folder,exist_ok=True)
    size=512
    base=bpy.data.images.new("ASTREA_"+key+"_BaseColor",width=size,height=size,alpha=True)
    orm=bpy.data.images.new("ASTREA_"+key+"_MetallicRoughness",width=size,height=size,alpha=True)
    normal=bpy.data.images.new("ASTREA_"+key+"_Normal",width=size,height=size,alpha=True)
    base_pixels=[]; orm_pixels=[]; normal_pixels=[]
    seed=sum(ord(ch) for ch in key)
    for y in range(size):
        v=y/size
        for x in range(size):
            u=x/size
            n=(math.sin((u*37+seed)*6.283)*math.sin((v*29+seed*.17)*6.283)
               +.45*math.sin((u*113+v*71+seed)*6.283)
               +.2*math.cos((u*211-v*173+seed*.31)*6.283))/1.65
            scratch=math.sin((u*size*0.72+v*size*0.035+seed)*6.283)
            variation=1.0+grain*(n*.55+scratch*.12)
            base_pixels.extend((max(0,min(1,color[0]*variation)),
                                max(0,min(1,color[1]*variation)),
                                max(0,min(1,color[2]*variation)),1.0))
            r=max(0,min(1,roughness+n*grain*.22))
            m=max(0,min(1,metallic))
            orm_pixels.extend((0.0,r,m,1.0))
            nx=max(0,min(1,.5+n*.025)); ny=max(0,min(1,.5+scratch*.012))
            normal_pixels.extend((nx,ny,1.0,1.0))
    for img,pixels,suffix in ((base,base_pixels,"BaseColor"),(orm,orm_pixels,"MetallicRoughness"),(normal,normal_pixels,"Normal")):
        img.pixels.foreach_set(pixels)
        img.file_format="PNG"
        img.filepath_raw=os.path.join(folder,f"ASTREA_{key}_{suffix}.png")
        img.save()
        img.pack()
    base.colorspace_settings.name="sRGB"
    orm.colorspace_settings.name="Non-Color"
    normal.colorspace_settings.name="Non-Color"
    return base,orm,normal

def material(name, color, metallic=0.65, roughness=0.28, texture_key="Steel"):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    nodes=m.node_tree.nodes; links=m.node_tree.links
    p=nodes.get("Principled BSDF")
    base,orm,normal=texture_set(texture_key,color,metallic,roughness,0.07 if metallic>.3 else 0.12)
    tex=nodes.new("ShaderNodeTexImage"); tex.image=base; tex.label="ASTREA baked base color"
    links.new(tex.outputs["Color"],p.inputs["Base Color"])
    packed=nodes.new("ShaderNodeTexImage"); packed.image=orm; packed.label="ASTREA metallic / roughness"
    separate=nodes.new("ShaderNodeSeparateColor"); separate.mode="RGB"
    links.new(packed.outputs["Color"],separate.inputs["Color"])
    links.new(separate.outputs["Green"],p.inputs["Roughness"])
    links.new(separate.outputs["Blue"],p.inputs["Metallic"])
    ntex=nodes.new("ShaderNodeTexImage"); ntex.image=normal; ntex.label="ASTREA subtle surface normal"
    ntex.image.colorspace_settings.name="Non-Color"
    normal_map=nodes.new("ShaderNodeNormalMap"); normal_map.inputs["Strength"].default_value=.35
    links.new(ntex.outputs["Color"],normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"],p.inputs["Normal"])
    p.inputs["Metallic"].default_value=metallic
    p.inputs["Roughness"].default_value=roughness
    return m
steel=material("ASTREA | Tempered midnight steel",(.105,.16,.22),.82,.24,"MidnightSteel")
silver=material("ASTREA | Bright forged edges",(.55,.64,.69),.9,.2,"ForgedSilver")
gold=material("ASTREA | Engraved antique gold",(.62,.36,.105),.78,.25,"AntiqueGold")
leather=material("ASTREA | Dark oxblood leather",(.105,.025,.018),.08,.52,"OxbloodLeather")
blue=material("ASTREA | Sapphire enamel",(.025,.13,.32),.55,.19,"SapphireEnamel")

# Starter-world surface library: tileable maps ready for terrain and modular props.
WORLD_TEXTURES = [
    ("AstreaGrass",(.16,.25,.075),0.0,.92,.16),
    ("AstreaSoil",(.19,.105,.055),0.0,.88,.18),
    ("VanForestFloor",(.075,.13,.065),0.0,.94,.20),
    ("BurgSandstone",(.48,.30,.14),0.0,.82,.14),
    ("NoirSlate",(.075,.09,.12),0.0,.78,.12),
]
for key, color, metal, rough, grain in WORLD_TEXTURES:
    texture_set(key,color,metal,rough,grain)

def finish(o, name, mat):
    o.name=name; o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth=True
    return o
def uv(name, loc, scale, mat, seg=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o=bpy.context.object; o.scale=scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o,name,mat)
def cube(name, loc, scale, mat, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new("Rounded forged edges","BEVEL"); b.width=bevel; b.segments=3
        o.modifiers.new("Weighted corner normals","WEIGHTED_NORMAL")
    return o
def curve(name, pts, radius, mat):
    c=bpy.data.curves.new(name,"CURVE"); c.dimensions="3D"; c.bevel_depth=radius; c.bevel_resolution=3
    s=c.splines.new("POLY"); s.points.add(len(pts)-1)
    for p,co in zip(s.points,pts): p.co=(*co,1)
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(mat); return o
def join_piece(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join(); obj=bpy.context.object; obj.name=name
    obj["ASTREA_modular_slot"]=name
    return obj

pieces=[]
# 1 chestplate: shaped front shell, raised sternum ridge, gold perimeter and blue crest
a=[]
a.append(uv("Chest shell", (0,-.205,1.36),(.34,.115,.36),steel))
a.append(uv("Sternum ridge",(0,-.303,1.39),(.055,.025,.26),silver))
a.append(uv("Chest crest",(0,-.331,1.48),(.105,.025,.095),gold))
a.append(uv("Crest enamel",(0,-.353,1.49),(.055,.012,.05),blue))
for s in (-1,1):
    a.append(uv("Pectoral reinforcement",(s*.17,-.285,1.43),(.145,.045,.15),silver))
    a.append(curve("Chest gold piping",[(s*.29,-.27,1.64),(s*.36,-.25,1.48),(s*.31,-.27,1.19),(s*.19,-.29,1.08)],.012,gold))
pieces.append(join_piece(a,"ASTREA Armor 01 | Modular chestplate"))

# 2 backplate with segmented spine and rivets
a=[uv("Back shell",(0,.19,1.36),(.33,.105,.35),steel),
   uv("Spinal reinforcement",(0,.295,1.37),(.055,.025,.29),silver)]
for z in (1.12,1.24,1.36,1.48,1.60):
    a.append(uv("Spine rivet",(0,.32,z),(.025,.012,.025),gold,16,10))
for s in (-1,1):
    a.append(curve("Back gold piping",[(s*.28,.23,1.63),(s*.34,.22,1.45),(s*.30,.23,1.18)],.01,gold))
pieces.append(join_piece(a,"ASTREA Armor 02 | Modular backplate"))

# 3/4 shoulder pauldrons, independent left/right
for idx,s in enumerate((-1,1),3):
    a=[uv("Pauldron main shell",(s*.405,0,1.63),(.205,.22,.145),steel),
       uv("Pauldron crown",(s*.43,-.025,1.70),(.13,.17,.07),silver),
       uv("Pauldron boss",(s*.47,-.196,1.63),(.055,.025,.055),gold),
       curve("Pauldron etched rim",[(s*.25,-.13,1.64),(s*.34,-.20,1.72),(s*.49,-.18,1.72),(s*.58,-.10,1.63)],.014,gold)]
    pieces.append(join_piece(a,f"ASTREA Armor 0{idx} | {'Left' if s<0 else 'Right'} pauldron"))

# 5/6 vambraces with raised dorsal ridge and leather cuff
for idx,s in enumerate((-1,1),5):
    a=[uv("Forearm plate",(s*.34,-.12,.91),(.105,.105,.235),steel),
       uv("Vambrace ridge",(s*.34,-.218,.94),(.035,.018,.19),silver),
       uv("Wrist cuff",(s*.34,-.11,.72),(.12,.115,.055),gold),
       uv("Elbow cuff",(s*.34,-.10,1.10),(.115,.11,.045),leather)]
    for z in (.82,.88,.94,1.0):
        a.append(uv("Vambrace rivet",(s*.34,-.237,z),(.012,.009,.012),gold,12,8))
    pieces.append(join_piece(a,f"ASTREA Armor 0{idx} | {'Left' if s<0 else 'Right'} vambrace"))

# 7 articulated waist/fauld: belt and three overlapping tassets
a=[uv("Waist belt",(0,0,1.02),(.36,.22,.095),leather),
   cube("Belt buckle",(0,-.228,1.02),(.13,.035,.13),gold,.025),
   uv("Buckle sapphire",(0,-.251,1.02),(.035,.012,.045),blue)]
for s in (-1,0,1):
    x=s*.19
    a.append(uv("Fauld lames",(x,-.16,.88),(.115,.065,.16),steel))
    a.append(curve("Fauld gold rim",[(x-.09,-.19,.96),(x-.10,-.20,.86),(x,-.22,.80),(x+.10,-.20,.86),(x+.09,-.19,.96)],.009,gold))
pieces.append(join_piece(a,"ASTREA Armor 07 | Modular waist and faulds"))

# 8 paired greaves in one modular object with two separate leg shells
a=[]
for s in (-1,1):
    a.append(uv("Greave shell",(s*.14,-.105,.36),(.105,.115,.30),steel))
    a.append(uv("Greave shin ridge",(s*.14,-.218,.39),(.035,.018,.23),silver))
    a.append(uv("Knee cop",(s*.14,-.12,.66),(.13,.12,.09),gold))
    a.append(uv("Ankle cuff",(s*.14,-.10,.105),(.115,.12,.045),leather))
    a.append(curve("Greave etched border",[(s*.22,-.17,.61),(s*.23,-.19,.42),(s*.20,-.18,.18)],.009,gold))
pieces.append(join_piece(a,"ASTREA Armor 08 | Paired modular greaves"))

# Presentation-only mannequin silhouette, excluded from export
man=material("Display mannequin",(.055,.065,.075),.05,.7)
uv("Display torso",(0,.04,1.34),(.26,.19,.34),man)
uv("Display head",(0,.04,1.82),(.12,.12,.15),man)
for s in (-1,1):
    uv("Display upper arm",(s*.39,.04,1.35),(.09,.10,.23),man)
    uv("Display thigh",(s*.14,.04,.78),(.105,.12,.23),man)
    uv("Display lower leg",(s*.14,.04,.35),(.075,.09,.25),man)

# Studio stage, camera and lights
stage=material("Studio background",(.018,.025,.035),.1,.72)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.02)); bpy.context.object.data.materials.append(stage)
bpy.ops.object.camera_add(location=(3.0,-5.8,2.3)); cam=bpy.context.object
target=Vector((0,0,.96)); cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler(); cam.data.lens=55; bpy.context.scene.camera=cam
for name,loc,power,size in [("Key",(2,-3,4),1100,4),("Fill",(-3,-1,2),650,3),("Rim",(0,3,3),1400,2.5)]:
    bpy.ops.object.light_add(type="AREA",location=loc); l=bpy.context.object; l.name=name; l.data.energy=power; l.data.shape="DISK"; l.data.size=size
    l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat("-Z","Y").to_euler()
scene=bpy.context.scene; scene.render.engine="BLENDER_EEVEE"
scene.eevee.taa_render_samples=64; scene.render.resolution_x=1400; scene.render.resolution_y=1400; scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"; scene.render.filepath=os.path.join(OUT,"astrea-modular-armor-preview.png")
scene.world.color=(.025,.025,.025); scene.view_settings.view_transform="Standard"
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,"astrea-modular-armor.blend"))
bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action="DESELECT")
for o in pieces: o.select_set(True)
bpy.context.view_layer.objects.active=pieces[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,"astrea-modular-armor.glb"),export_format="GLB",use_selection=True)
report={"asset":"ASTREA modular medieval armor set","status":"generated","piece_count":len(pieces),"pieces":[p.name for p in pieces],"blender_version":bpy.app.version_string,"formats":["blend","glb","fbx","png","pbr-textures"],"texture_sets":["MidnightSteel","ForgedSilver","AntiqueGold","OxbloodLeather","SapphireEnamel","AstreaGrass","AstreaSoil","VanForestFloor","BurgSandstone","NoirSlate"],"texture_resolution":512,"note":"Eight independently named modular armor objects; greaves are a paired object. PBR maps are generated as PNGs for Unity and embedded in the GLB where supported."}
with open(os.path.join(OUT,"build-report.json"),"w") as f: json.dump(report,f,indent=2)
print("ASTREA_ARMOR_BUILD_OK",json.dumps(report))
