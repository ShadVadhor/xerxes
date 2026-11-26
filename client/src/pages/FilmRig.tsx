import { useRef } from "react";
import DescentScene from "@/components/xerxes/DescentScene";

/** Development-only: a bare full-screen DescentScene driven from outside (window.__filmFrame) for the hero film. */
export default function FilmRig() {
  const progressRef = useRef(0);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#06070a" }}>
      <DescentScene progressRef={progressRef} />
    </div>
  );
}
