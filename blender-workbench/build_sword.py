import bpy, math, json, os
from mathutils import Vector

OUT=os.environ.get("ASTREA_OUTPUT_DIR",os.path.abspath("build"))
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)

def mat(n,c,metal=0,rough=.4):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF"); p.inputs["Base Color"].default_value=(*c,1); p.inputs["Metallic"].default_value=metal; p.inputs["Roughness"].default_value=rough
 return m
steel=mat("Forged steel",(.42,.49,.56),.88,.23); bright=mat("Polished edge",(.78,.83,.86),.92,.16)
gold=mat("Antique gold",(.62,.39,.12),.78,.24); leather=mat("Oxblood leather",(.12,.035,.025),.05,.48); blue=mat("Sapphire",(.025,.12,.32),.65,.14)
def bevel(o,w,seg=3):
 b=o.modifiers.new("Crafted bevel","BEVEL"); b.width=w; b.segments=seg; o.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
def cube(n,loc,scale,m,w=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=n; o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(m)
 if w: bevel(o,w)
 return o
def cyl(n,loc,r,d,m,v=32,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=loc,rotation=rot); o=bpy.context.object; o.name=n; o.data.materials.append(m); bevel(o,.02); return o
profile=[(-.12,0),(.12,0),(.105,1.48),(.075,1.88),(0,2.08),(-.075,1.88),(-.105,1.48)]
verts=[(x,y,z+.02) for y in (-.035,.035) for x,z in profile]; n=len(profile)
faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
for i in range(n): j=(i+1)%n; faces.append((i,j,n+j,n+i))
me=bpy.data.meshes.new("Tapered forged blade"); me.from_pydata(verts,[],faces); me.materials.append(steel)
blade=bpy.data.objects.new("ASTREA | Tapered steel blade",me); bpy.context.collection.objects.link(blade); bevel(blade,.012,2)
for s in (-1,1):
 for x in (-.108,.108):
  o=cube("Polished blade bevel",(x,s*.039,1.12),(.012,.009,1.55),bright,.004); o.rotation_euler[1]=-.012 if x<0 else .012
for s in (-1,1):
 arm=cube("Swept gold crossguard",(s*.34,0,.02),(.72,.13,.16),gold,.065); arm.rotation_euler[1]=s*math.radians(-13)
# Central guard boss overlaps the blade root and grip, eliminating the visible gap.
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=(0,0,.035)); boss=bpy.context.object; boss.name="Gold crossguard central boss"; boss.scale=(.17,.095,.13); boss.data.materials.append(gold)
cyl("Leather wrapped grip",(0,0,-.34),.085,.58,leather,12)
for z in [-.60+i*.065 for i in range(9)]:
 bpy.ops.mesh.primitive_torus_add(major_radius=.083,minor_radius=.009,major_segments=24,minor_segments=8,location=(0,0,z))
 o=bpy.context.object; o.name="Grip binding"; o.data.materials.append(gold if z in (-.60,-.08) else leather)
cyl("Pommel neck",(0,0,-.69),.095,.12,gold,24)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.14,location=(0,0,-.82)); pom=bpy.context.object; pom.name="Faceted gold pommel"; pom.scale=(.9,.9,1.05); pom.data.materials.append(gold); bevel(pom,.008,2)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.052,location=(0,-.132,-.82)); gem=bpy.context.object; gem.name="Pommel sapphire"; gem.scale=(1,.35,1); gem.data.materials.append(blue)
cube("Display plinth",(0,0,-1.12),(1.45,.65,.18),mat("Studio charcoal",(.018,.025,.035),.15,.7),.07)
bpy.ops.object.camera_add(location=(3.4,-5.6,2.25)); cam=bpy.context.object
target=Vector((0,0,.58)); cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler(); cam.data.lens=58; bpy.context.scene.camera=cam
for name,loc,power,size in [("Key",(2,-3,4),850,4),("Fill",(-3,-1,1.8),500,3),("Rim",(0,3,3),1100,2.5)]:
 bpy.ops.object.light_add(type="AREA",location=loc); l=bpy.context.object; l.name=name; l.data.energy=power; l.data.shape="DISK"; l.data.size=size; l.rotation_euler=(Vector((0,0,.4))-l.location).to_track_quat("-Z","Y").to_euler()
scene=bpy.context.scene; scene.render.engine="BLENDER_EEVEE"; scene.eevee.taa_render_samples=48
scene.render.resolution_x=1200; scene.render.resolution_y=1200; scene.render.resolution_percentage=100; scene.render.image_settings.file_format="PNG"
scene.render.filepath=os.path.join(OUT,"astrea-ceremonial-sword.png"); scene.world.color=(.035,.035,.035); scene.view_settings.view_transform="Standard"
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,"astrea-ceremonial-sword.blend")); bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action="DESELECT")
for o in scene.objects:
 if o.type=="MESH" and o.name!="Display plinth": o.select_set(True)
bpy.context.view_layer.objects.active=bpy.context.selected_objects[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,"astrea-ceremonial-sword.glb"),export_format="GLB",use_selection=True)
report={"asset":"ASTREA ceremonial sword","status":"generated","blender_version":bpy.app.version_string,"formats":["blend","glb","png"]}
with open(os.path.join(OUT,"build-report.json"),"w") as f: json.dump(report,f,indent=2)
print("ASTREA_ASSET_BUILD_OK",json.dumps(report))
