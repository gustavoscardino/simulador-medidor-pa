# Assets

`Models/` holds the source GLBs that `src/App.ts` loads at runtime through Vite asset
URLs: the doctor's office room, examination chair, seated patient, sphygmomanometer,
stethoscope, hand sanitizer, and the folded cuff set (`Models/cuffs/`, see its README).

The room is composed in code, not exported from the Babylon.js Editor. Positions and
dimensions live in `src/scene/clinicalLayout.ts`.

The earlier Editor scenes (`example.scene` pinch-box prototype and the procedural
`clinical-room.scene` blockout) and their `public/scene/` exports were removed after the
GLB room replaced them; they remain available in Git history.
