"use client";

import { memo, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import { OrbitScene } from "./OrbitScene";

const compactDevice = () =>
  typeof matchMedia !== "undefined" && matchMedia("(max-width: 700px), (pointer: coarse)").matches;

/** The WebGL canvas behind the hero. Loaded client-side only. */
function OrbitCanvas(props) {
  const onCreated = useCallback(
    ({ gl }) => {
      gl.setClearColor("#090c10", 0);
      gl.toneMapping = ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.05;
      gl.domElement.style.touchAction = props.exploreTouch ? "none" : "pan-y pinch-zoom";
    },
    [props.exploreTouch],
  );

  return (
    <Canvas
      frameloop="demand"
      resize={{ scroll: false }}
      dpr={[1, compactDevice() ? 1.25 : 1.5]}
      camera={{ position: [0, 0, 9.4], fov: 40, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={onCreated}
      style={{ touchAction: props.exploreTouch ? "none" : "pan-y pinch-zoom" }}
    >
      <OrbitScene {...props} />
    </Canvas>
  );
}

export default memo(OrbitCanvas);
