import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { CreateTube } from "@babylonjs/core/Meshes/Builders/tubeBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Curve3 } from "@babylonjs/core/Maths/math.path";

/** Route both real instrument connections to the fitted cuff, replacing storage hoses. */
export function connectCuffInstrument(cuff: Mesh, instrument: TransformNode): TransformNode {
	const scene = cuff.getScene();
	const source = instrument.getChildMeshes().find((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.metadata?.logicalTarget === "gauge");
	if (!source) throw new Error("Instrumento não encontrado para conectar o manguito.");
	cuff.computeWorldMatrix(true);
	source.computeWorldMatrix(true);
	const connections = [new Vector3(0.435, 0.20, 0), new Vector3(-0.287, 0.179, 0.846)];
	const ports = cuff.metadata.hosePorts as number[][];
	const root = new TransformNode("fitted-cuff-hoses", scene);
	const rubber = new StandardMaterial("fitted-cuff-hose-rubber", scene);
	rubber.diffuseColor = Color3.FromHexString("#171c20");
	rubber.specularColor.setAll(0.08);
	for (let index = 0; index < connections.length; index++) {
		const start = Vector3.TransformCoordinates(Vector3.FromArray(ports[index]), cuff.getWorldMatrix());
		const end = Vector3.TransformCoordinates(connections[index], source.getWorldMatrix());
		const path = Curve3.CreateCubicBezier(
			// Lift out from the cuff on the measured-arm side before dropping
			// toward the instrument, keeping both hoses outside the forearm.
			start, start.add(new Vector3(0.25, 0.14, index ? -0.015 : -0.04)),
			end.add(new Vector3(-0.02, 0.10, index ? -0.02 : -0.04)), end, 40,
		).getPoints();
		const tube = CreateTube(`fitted-cuff-hose-${index}`, { path, radius: 0.003, tessellation: 10, cap: Mesh.CAP_ALL }, scene);
		tube.parent = root;
		tube.material = rubber;
		tube.metadata = { logicalTarget: "gauge", instrumentRole: "pressure-hose" };
	}
	return root;
}
