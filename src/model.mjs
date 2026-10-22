// Public numbers are from the dated SpaceX references. Geometry stations are illustrative.
export const reference = {
  title: 'Starship', revision: '2026 design reference', architecture: 'V3 architecture',
  retrieved: '22 Oct 2026', update: '12 May 2026', height: 52, diameter: 9,
  seaEngines: 3, vacuumEngines: 3,
  designUrl: 'https://www.spacex.com/vehicles/starship/design',
  updateUrl: 'https://www.spacex.com/updates#starship-v3',
};

export const systems = [
  ['all','All systems'],['propulsion','Propulsion'],['fluids','Tanks & fluids'],
  ['structure','Structure & TPS'],['attitude','Attitude control'],['payload','Payload'],
];

export const parts = {
  nose: { name:'Nose & forward shell', short:'Forward shell', systems:['structure'], move:[0,0,142],
    subtitle:'Shape the flow. Protect the forward volume.',
    description:'The pointed forebody closes the vehicle. Stainless-steel structure carries loads; the windward thermal protection limits heating during atmospheric entry.',
    relation:'Joins the payload barrel below. The forward flap roots transfer aerodynamic loads into this structure.',
    detail:'Outer contour follows the 2026 reference. Weld spacing, wall thickness and internal interfaces are illustrative.', evidence:'Exterior reference', adjacent:['payload','forward'] },
  payload: { name:'Payload bay', short:'Payload bay', systems:['payload','structure'], move:[0,0,87],
    subtitle:'An accommodation volume above the tanks.',
    description:'Payload support hardware carries cargo loads into the cylindrical airframe. The V3 design includes an updated Starlink deployment mechanism.',
    relation:'Sits between the forward shell and methane tank. Power and command connections link payload equipment to the vehicle avionics.',
    detail:'The open rack and trays explain accommodation only. They are not a reconstruction of the proprietary PEZ dispenser.', evidence:'Schematic interior', adjacent:['nose','methane','avionics'] },
  methane: { name:'Liquid methane tank', short:'Methane tank', systems:['fluids','structure'], move:[0,0,31],
    subtitle:'Fuel storage within the load-bearing barrel.',
    description:'Cryogenic liquid methane supplies fuel to the Raptors. The tank wall is part of the vehicle structure, rather than a separate vessel inside an outer fuselage.',
    relation:'A shared pressure boundary separates fuel from oxygen below. Feed and pressure-control systems connect the tank to the propulsion system.',
    detail:'Tank lengths, dome contours and port positions are schematic. No individual tank capacity is asserted.', evidence:'Schematic pressure boundary', adjacent:['payload','oxygen','sea','vac'] },
  oxygen: { name:'Liquid oxygen tank', short:'Oxygen tank', systems:['fluids','structure'], move:[0,0,-25],
    subtitle:'Oxidizer storage and the common bulkhead.',
    description:'Liquid oxygen supplies the oxidizer for methane combustion. A domed common bulkhead separates the main propellants; the aft dome closes the tank above the engine region.',
    relation:'Connects the upper tank barrel to the aft load path. Oxidizer outlets and fuel feed routing serve the engine cluster below.',
    detail:'The domes, interfaces and section lengths are illustrative. The reveal is an explanatory section, not a removable welded assembly.', evidence:'Schematic pressure boundary', adjacent:['methane','aft','sea','vac'] },
  aft: { name:'Aft skirt & thrust structure', short:'Thrust structure', systems:['structure','propulsion'], move:[0,0,-84],
    subtitle:'Six engines. One structural load path.',
    description:'Engine mounts distribute thrust into the vehicle. The surrounding aft structure carries local hardware and the aft flap roots.',
    relation:'Receives loads from both Raptor groups and connects to the oxygen-tank barrel. V3 reroutes fluid and electrical systems and removes individual engine shrouds.',
    detail:'The ring, webs and mounts show load paths. Their exact geometry and the split-open skirt are schematic.', evidence:'V3 architecture / schematic detail', adjacent:['oxygen','sea','vac','rear'] },
  sea: { name:'Sea-level Raptor engines', short:'Sea-level Raptors', systems:['propulsion'], move:[0,0,-192],
    subtitle:'Three compact nozzles in the center.',
    description:'Three sea-level Raptor engines complement the vacuum engines. Their smaller nozzles suit operation in denser air; the central group provides thrust-vector control.',
    relation:'Bolts into the thrust structure and receives both methane and oxygen. Gimbaled thrust works with aerodynamic controls during the return sequence.',
    detail:'Exactly three engines are drawn. Bodies and feed connections are simplified Raptor 3 representations; no engine is an exact CAD replica.', evidence:'Official count / schematic detail', adjacent:['aft','methane','oxygen','rear'] },
  vac: { name:'Raptor Vacuum engines', short:'Vacuum Raptors', systems:['propulsion'], move:[0,0,-123],
    subtitle:'Three large expansion nozzles around the core.',
    description:'Three Raptor Vacuum engines use larger nozzles to expand exhaust in near-vacuum conditions. They surround the compact central engine group.',
    relation:'Shares the propellant supply and aft thrust structure with the sea-level engines. The larger bells are the visible distinction in this view.',
    detail:'Exactly three vacuum engines are drawn. Bell dimensions, mounts and pipe routes are illustrative.', evidence:'Official count / schematic detail', adjacent:['aft','methane','oxygen','sea'] },
  forward: { name:'Forward flaps', short:'Forward flaps', systems:['attitude','structure'], move:[0,0,142],
    subtitle:'Forward aerodynamic control surfaces.',
    description:'The two forward flaps change aerodynamic forces on the upper body during atmospheric descent. Their thermal protection and hinge regions must withstand the entry environment.',
    relation:'Actuation is commanded by avionics. Together with the aft flaps, the pair controls vehicle orientation in atmospheric flight.',
    detail:'The pair is shown detached for visibility. Hinge internals and actuator placement are schematic; this control does not simulate flap deflection.', evidence:'Exterior reference / schematic joints', adjacent:['nose','rear','avionics'] },
  rear: { name:'Aft flaps', short:'Aft flaps', systems:['attitude','structure'], move:[0,0,-84],
    subtitle:'Large surfaces for the return through air.',
    description:'Two aft flaps work with the forward pair to manage aerodynamic attitude. V3 uses a single actuator with three motors for each aft flap.',
    relation:'Hinge loads enter the aft body. Avionics commands the actuators; sea-level engine thrust provides another source of control during powered return.',
    detail:'The three motor cans per actuator illustrate the published redundancy. Their size, arrangement and hinge hardware are not flight drawings.', evidence:'V3 actuator architecture', adjacent:['aft','forward','sea','avionics'] },
  avionics: { name:'Avionics & reaction control', short:'Avionics & RCS', systems:['attitude'], move:[0,0,0],
    subtitle:'Sense, command and steer beyond the atmosphere.',
    description:'Avionics coordinates sensors, power and commands. Reaction control supplies attitude authority when aerodynamic surfaces have little effect.',
    relation:'Connects propulsion, flap actuation and payload equipment. Small control hardware stays with its supporting body section as the ship opens.',
    detail:'Selected covers and ports indicate distributed equipment. Their count and locations are illustrative, not a complete RCS or avionics inventory.', evidence:'Functional schematic', adjacent:['forward','rear','sea','payload'] },
};

// All shell panels clear their enclosed hardware before the axial stack opens.
export const channels = {
  nose:parts.nose.move,payload:parts.payload.move,methane:parts.methane.move,
  oxygen:parts.oxygen.move,aft:parts.aft.move,sea:parts.sea.move,vac:parts.vac.move,
  payloadSkin:[-41.04,112.76,87], aftSkin:[-44.46,122.16,-84],
  forwardL:[-77,110,142],forwardR:[77,-110,142],
  rearL:[-84,120,-84],rearR:[84,-120,-84],
};
export const stagger = ['forwardL','forwardR','rearL','rearR','sea','vac','nose','payloadSkin','payload','methane','aftSkin','aft','oxygen'];
export const spring = {phase:0.012,stiffness:64,damping:16,substeps:4};
