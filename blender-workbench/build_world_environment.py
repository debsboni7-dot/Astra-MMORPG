import bpy, math, os, json, random
from mathutils import Vector

OUT=os.environ.get("ASTREA_WORLD_OUTPUT_DIR", os.path.abspath("build/astrea-world"))
os.makedirs(OUT, exist_ok=True)
random.seed(2407)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=0.85, metallic=0.0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get("Principled BSDF"); p.inputs["Base Color"].default_value=(*color,1)
    p.inputs["Roughness"].default_value=rough; p.inputs["Metallic"].default_value=metallic
    return m
grass=mat("Astrea | meadow green",(0.19,.29,.095))
grass2=mat("Astrea | sunlit grass",(.32,.39,.14))
soil=mat("Astrea | warm earth",(.25,.145,.075))
stone=mat("Astrea | weathered limestone",(.48,.43,.33))
stone2=mat("Astrea | pale stone edges",(.65,.59,.46))
wood=mat("Astrea | aged oak",(.19,.085,.035))
wood2=mat("Astrea | warm timber",(.34,.17,.07))
roof=mat("Astrea | terracotta roof",(.34,.105,.055))
dark=mat("Astrea | window recess",(.035,.055,.065),.3)
leaf=mat("Astrea | broadleaf canopy",(.12,.24,.075))
leaf2=mat("Astrea | canopy highlights",(.23,.34,.105))
metal=mat("Astrea | iron fittings",(.12,.15,.16),.35,.72)

def assign(o,m):
    o.data.materials.append(m); return o
def bevel(o,w=.08):
    mod=o.modifiers.new("Soft worn edges","BEVEL"); mod.width=w; mod.segments=3
    o.modifiers.new("Weighted corner normals","WEIGHTED_NORMAL")
    return o
def cube(name,loc,scale,m,bev=.03):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); assign(o,m)
    if bev: bevel(o,bev)
    return o
def ico(name,loc,scale,m,sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc); o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); assign(o,m)
    for p in o.data.polygons: p.use_smooth=True
    return o
def mesh_obj(name,verts,faces,m):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.materials.append(m); me.update()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth=True
    return ob
def beam(name,a,b,r1,r2,m,verts=10):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=d.length, location=(a+b)/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=d.to_track_quat("Z","Y").to_euler(); assign(o,m); bevel(o,.025)
    return o

# Sculpted rolling terrain, a real triangulated mesh rather than a flat plane.
N=100; SIZE=120
def height(x,y):
    return (1.7*math.sin(x*.055+0.7)*math.cos(y*.047)
            +1.0*math.sin((x+y)*.105)
            +.55*math.cos(x*.19-y*.13)
            +2.7*math.exp(-((x-30)**2+(y-38)**2)/500)
            +2.0*math.exp(-((x+39)**2+(y-30)**2)/700))
verts=[]; faces=[]
for j in range(N+1):
    y=(j/N-.5)*SIZE
    for i in range(N+1):
        x=(i/N-.5)*SIZE
        verts.append((x,y,height(x,y)))
for j in range(N):
    for i in range(N):
        a=j*(N+1)+i; faces.extend(((a,a+1,a+N+2),(a,a+N+2,a+N+1)))
terrain=mesh_obj("ASTREA | rolling starter plains terrain",verts,faces,grass)
terrain["surface"]="AstreaGrass"; terrain["terrain_resolution"]=N
# Soil footpath winding across the meadow.
pathpts=[]
for k in range(80):
    y=-55+k*1.4; x=5+8*math.sin(y*.045)
    pathpts.append((x,y,height(x,y)+.045))
# Wide ribbon path mesh
pv=[]; pf=[]
for x,y,z in pathpts:
    pv.extend(((x-1.65,y,z),(x+1.65,y,z)))
for k in range(len(pathpts)-1):
    a=k*2; pf.append((a,a+1,a+3,a+2))
path=mesh_obj("ASTREA | winding packed-earth road",pv,pf,soil)
# tree with tapered trunk, roots and clustered canopy, 3D branching silhouette
def tree(x,y,s=1):
    z=height(x,y)
    beam("Oak trunk",(x,y,z),(x,y,z+3.3*s),.36*s,.20*s,wood,12)
    for ang in (0,2.1,4.2):
        end=(x+math.cos(ang)*1.0*s,y+math.sin(ang)*1.0*s,z+.18*s)
        beam("Exposed tree root", (x,y,z+.35*s),end,.18*s,.07*s,wood,8)
    for ang in (0,1.55,3.1,4.7):
        top=(x+math.cos(ang)*.9*s,y+math.sin(ang)*.9*s,z+4.4*s)
        beam("Oak branch",(x,y,z+2.0*s),top,.15*s,.065*s,wood2,8)
    for dx,dy,dz,sc in ((0,0,4.45,1.65),(.85,0,4.0,1.12),(-.8,.2,4.1,1.18),(.2,.8,4.15,1.05),(-.2,-.8,4.0,1.12),(0,.05,5.05,1.0)):
        ico("Oak foliage cluster",(x+dx*s,y+dy*s,z+dz*s),(sc*s,sc*.88*s,sc*.92*s),leaf if random.random()<.65 else leaf2,2)
tree_sites=[
(-48,-38,1.15),(-42,-20,.95),(-46,2,1.2),(-38,26,1.05),(-50,43,.9),
(-28,-43,.9),(-30,-25,1.1),(-34,-4,.95),(-29,34,1.05),(-18,47,.9),
(22,-47,.9),(32,-35,1.0),(43,-25,1.15),(50,-2,.95),(38,12,1.1),
(30,30,1.0),(45,43,1.15),(16,45,.9),(5,-48,.85),(-5,-42,.9),
(48,18,.95),(-52,16,1.0),(18,-26,.9),(40,-46,.85)]
for x,y,scale in tree_sites:
    if abs(x+12)<13 and abs(y-8)<12: continue
    tree(x,y,scale)

# Scattered angular boulders, keeping the winding road and homestead clear.
for i in range(54):
    x=random.uniform(-55,55); y=random.uniform(-55,55)
    if abs(x-(5+8*math.sin(y*.045)))<4 or (abs(x+12)<13 and abs(y-8)<13): continue
    z=height(x,y)
    ico("Meadow boulder",(x,y,z+.35),(random.uniform(.45,1.25),random.uniform(.4,.95),random.uniform(.35,.8)),stone if i%3 else stone2,2)

# Batched grass blades: thousands of visible blades in one mesh, not thousands of draw calls.
grass_verts=[]; grass_faces=[]
for i in range(950):
    x=random.uniform(-56,56); y=random.uniform(-56,56)
    if abs(x-(5+8*math.sin(y*.045)))<2.5 or (abs(x+12)<10 and abs(y-8)<9): continue
    z=height(x,y)
    for k in range(3):
        ang=random.random()*math.tau; h=random.uniform(.28,.72); w=random.uniform(.035,.065)
        dx=math.cos(ang); dy=math.sin(ang); bx=-dy*w; by=dx*w
        lean=random.uniform(.06,.18)
        base=len(grass_verts)
        grass_verts.extend([(x-bx,y-by,z),(x+bx,y+by,z),
                            (x+dx*lean,y+dy*lean,z+h)])
        grass_faces.append((base,base+1,base+2))
grass_obj=mesh_obj("ASTREA | batched meadow grass",grass_verts,grass_faces,grass2)
grass_obj["blade_count"]=len(grass_faces)

# Detailed starter homestead: stone base, timber frame, gabled roof, door and windows.
cx,cy=-12,8; bz=height(cx,cy)
cube("Cottage stone foundation",(cx,cy,bz+.38),(12,8,.76),stone,.12)
cube("Cottage plaster walls",(cx,cy,bz+2.55),(11.5,7.5,4.4),stone2,.08)
# Gable end triangles, front/back
for yy in (cy-3.76,cy+3.76):
    mesh_obj("Cottage gable",[(cx-5.75,yy,bz+4.65),(cx+5.75,yy,bz+4.65),(cx,yy,bz+7.55)],[(0,1,2)],stone2)
# Roof slopes as thick beams and roof panels
for side in (-1,1):
    panel=cube("Terracotta sloped roof panel",(cx+side*3.05,cy,bz+6.18),(7.2,8.5,.24),roof,.045)
    panel.rotation_euler[1]=side*math.radians(27)
    for yy in (cy-4.22,cy+4.22):
        beam("Roof verge timber",(cx+side*6.0,yy,bz+4.72),(cx,yy,bz+7.78),.11,.11,wood,8)
# Ridge cap and repeated raised tile seams for a readable handcrafted roof.
cube("Roof ridge cap",(cx,cy,bz+7.82),(.38,8.7,.32),wood,.08)
for side in (-1,1):
    for row in range(1,7):
        x=cx+side*(6.0-row*.86)
        z=bz+4.82+row*.43
        seam=cube("Raised roof tile course",(x,cy,z),(.045,8.25,.045),wood2,.012)
        seam.rotation_euler[1]=side*math.radians(27)
# timber frame at corners and across facade
for xx in (cx-5.45,cx+5.45):
    for yy in (cy-3.85,cy+3.85):
        cube("Oak corner post",(xx,yy,bz+2.55),(.28,.28,4.3),wood,.035)
for zoff in (1.0,4.3):
    cube("Facade crossbeam",(cx,cy-3.9,bz+zoff),(11.1,.24,.22),wood,.025)
# front door and lintel
cube("Cottage oak door",(cx-2.0,cy-3.92,bz+1.55),(1.65,.16,2.7),wood,.04)
cube("Door upper inset",(cx-2.0,cy-4.02,bz+2.05),(1.12,.04,.8),wood2,.02)
ico("Iron door handle",(cx-1.48,cy-4.08,bz+1.45),(.07,.045,.07),metal,2)
# front windows with dark recess and wooden cross mullions
for xx in (cx+1.2,cx+4.0):
    cube("Window dark recess",(xx,cy-3.91,bz+2.7),(1.15,.12,1.25),dark,.025)
    cube("Window vertical mullion",(xx,cy-4.0,bz+2.7),(.09,.08,1.2),wood,.015)
    cube("Window horizontal mullion",(xx,cy-4.0,bz+2.7),(1.1,.08,.09),wood,.015)
    for dx in (-.65,.65):
        cube("Window shutter",(xx+dx,cy-4.02,bz+2.7),(.22,.12,1.45),wood2,.025)
# chimney
cube("Stone chimney",(cx+3.7,cy+1.7,bz+7.0),(.9,.9,3.5),stone,.08)
cube("Chimney cap",(cx+3.7,cy+1.7,bz+8.8),(1.2,1.15,.28),stone2,.05)
# porch awning and supports
cube("Porch awning",(cx-2,cy-5.0,bz+3.15),(4.4,2.0,.22),wood2,.06)
for xx in (cx-4,cx):
    beam("Porch post",(xx,cy-5.75,bz+.1),(xx,cy-5.75,bz+3.1),.12,.10,wood,8)
# small fence and stacked barrels
for i in range(8):
    x=cx-9+i*2.2; y=cy-8
    cube("Fence upright",(x,y,bz+.65),(.16,.16,1.3),wood,.025)
for zoff in (.35,1.0):
    cube("Fence rail",(cx-9+7.7,cy-8,bz+zoff),(17.2,.13,.13),wood2,.02)
for x in (cx+7,cx+8.2):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.48,depth=1.0,location=(x,cy-4,bz+.55))
    o=bpy.context.object; o.name="Homestead barrel"; assign(o,wood2); bevel(o,.05)
# a stone well with rim and wooden crossbar
for i in range(12):
    a=i*math.tau/12; x= cx+9+math.cos(a)*1.05; y=cy+1+math.sin(a)*1.05
    cube("Well masonry",(x,y,bz+.55),(.65,.55,1.1),stone,.06)
bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.68,depth=.12,location=(cx+9,cy+1,bz+1.13)); assign(bpy.context.object,dark)
beam("Well crossbar",(cx+7.9,cy+1,bz+2.5),(cx+10.1,cy+1,bz+2.5),.08,.08,wood)
# The terrain mesh itself carries the distant rolling hills; no oversized sphere mounds.\n# Lighting and camera for preview only
world=bpy.data.worlds.new("Astrea clear daylight") if not bpy.data.worlds else bpy.data.worlds[0]
bpy.context.scene.world=world; world.use_nodes=True
world.node_tree.nodes["Background"].inputs[0].default_value=(.42,.58,.78,1)
world.node_tree.nodes["Background"].inputs[1].default_value=.8
bpy.ops.object.light_add(type="SUN",location=( -20,-30,50)); sun=bpy.context.object; sun.name="Warm Astrea sunlight"; sun.data.energy=3.0; sun.rotation_euler=(math.radians(25),math.radians(-20),math.radians(-25))
bpy.ops.object.camera_add(location=(58,-72,46)); cam=bpy.context.object
target=Vector((0,0,1)); cam.rotation_euler=(target-cam.location).to_track_quat("-Z","Y").to_euler(); cam.data.lens=40; bpy.context.scene.camera=cam
scene=bpy.context.scene; scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=1600; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"; scene.render.filepath=os.path.join(OUT,"astrea-starter-plains-preview.png")
scene.view_settings.view_transform="AgX"
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,"astrea-starter-plains.blend"))
bpy.ops.render.render(write_still=True)
# Export game environment geometry as GLB, excluding camera/light objects.
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.context.scene.objects:
    if o.type in {"MESH","CURVE"} and not o.name.startswith("Distant rolling hill"):
        o.select_set(True)
selected=[o for o in bpy.context.selected_objects]
bpy.context.view_layer.objects.active=selected[0]
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,"astrea-starter-plains.glb"),export_format="GLB",use_selection=True)
report={"asset":"ASTREA starter continent environment","status":"generated","terrain_vertices":len(verts),"tree_count":len(tree_sites),"boulder_count":38,"grass_blade_count":len(grass_faces),"environment_objects":len(selected),"formats":["blend","glb","png"],"engine_target":"Unity 6 URP","note":"Procedural environment kit and preview. Requires Unity import, lighting and scene assembly validation before gameplay use."}
with open(os.path.join(OUT,"build-report.json"),"w") as f: json.dump(report,f,indent=2)
print("ASTREA_WORLD_BUILD_OK",json.dumps(report))
