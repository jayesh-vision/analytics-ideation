import { PersonaShell } from "./shell/PersonaShell";

// DataByte Enterprise Intelligence — persona-driven, agent-first shell.
// The former data-transformation flow now lives as the Talk-to-Data agent surface
// (see shell/PersonaShell → surfaces/DataPrepFlow).
export default function App() {
  return <PersonaShell />;
}
