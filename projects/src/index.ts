import { FileSystem } from "@davidsouther/jiffies/lib/esm/fs.js";

import * as project_01 from "./project_01/index.js";
import * as project_02 from "./project_02/index.js";
import * as project_03 from "./project_03/index.js";
import * as project_04 from "./project_04/index.js";
import * as project_05 from "./project_05/index.js";
import * as project_07 from "./project_07/index.js";
import * as project_08 from "./project_08/index.js";

/**
 * Duplicated for web from node:path.
 * A parsed path object generated by path.parse() or consumed by path.format().
 */
export interface ParsedPath {
  /** The root of the path such as '/' or 'c:\' */
  root: string;
  /** The full directory path such as '/home/user/dir' or 'c:\path\dir' */
  dir: string;
  /** The file name including extension (if any) such as 'index.html' */
  base: string;
  /** The file extension (if any) such as '.html' */
  ext: string;
  /** The file name without extension (if any) such as 'index' */
  name: string;
}

export type Assignment = ParsedPath;

export const ChipProjects = {
  "01": project_01,
  "02": project_02,
  "03": project_03,
  "05": project_05,
};

export const VmProjects = {
  "07": project_07,
  "08": project_08,
};

const Projects = {
  1: project_01,
  2: project_02,
  3: project_03,
  4: project_04,
  5: project_05,
  7: project_07,
  8: project_08,
};

let reset = false;
export const resetFiles = async (fs: FileSystem, projects?: number[]) => {
  if (reset) return; // React will double-render a call to resetFiles in useEffect.
  reset = true;
  projects ??= [1, 2, 3, 4, 5, 7, 8];
  for (const project of projects) {
    if (!Object.keys(Projects).includes(project.toString())) {
      continue;
    }
    await Projects[project as keyof typeof Projects].resetFiles(fs);
  }
  reset = false;
};

export const resetTests = async (fs: FileSystem, projects?: number[]) => {
  if (reset) return; // React will double-render a call to resetTests in useEffect.
  reset = true;
  projects ??= [1, 2, 3, 4, 5, 7, 8];
  for (const project of projects) {
    if (!Object.keys(Projects).includes(project.toString())) {
      continue;
    }
    await Projects[project as keyof typeof Projects].resetTests(fs);
  }
  reset = false;
};

export const BUILTIN_CHIP_PROJECTS: Record<
  "01" | "02" | "03" | "05",
  string[]
> = {
  "01": ["Nand"],
  "02": [],
  "03": ["DFF"],
  "05": ["Screen", "Keyboard", "DRegister", "ARegister", "ROM32K"],
};

export const CHIP_PROJECTS: Record<"01" | "02" | "03" | "05", string[]> = {
  "01": [
    "Not",
    "And",
    "Or",
    "Xor",
    "Mux",
    "DMux",
    "Not16",
    "And16",
    "Or16",
    "Mux16",
    "Or8Way",
    "Mux4Way16",
    "Mux8Way16",
    "DMux4Way",
    "DMux8Way",
  ],
  "02": [
    "HalfAdder",
    "FullAdder",
    "Add16",
    "Inc16",
    "ALU",
    // "ALUAll", // Special secret undocumented ALU tests
  ],
  "03": ["Bit", "Register", "RAM8", "RAM64", "RAM512", "RAM4K", "RAM16K", "PC"],
  "05": ["Memory", "CPU", "Computer"],
};

export const CHIP_ORDER: Partial<Record<"01" | "02" | "03" | "05", string[]>> =
  {
    "05": [
      "Memory",
      "CPU",
      "Computer",
      "Screen",
      "Keyboard",
      "DRegister",
      "ARegister",
      "ROM32K",
    ],
  };

export const ASM_PROJECTS: Record<"06", string[]> = {
  "06": ["Add", "Max", "Rectangle", "Pong"],
};

export const VM_PROJECTS: Record<"07" | "08", string[]> = {
  "07": ["SimpleAdd", "StackTest", "BasicTest", "PointerTest", "StaticTest"],
  "08": [
    "BasicLoop",
    "FibonacciSeries",
    "SimpleFunction",
    "NestedCall",
    "FibonacciElement",
    "StaticsTest",
  ],
};

export const Assignments = {
  ...project_01.CHIPS,
  ...project_02.CHIPS,
  ...project_03.CHIPS,
  ...project_05.CHIPS,
  ...project_07.VMS,
  ...project_08.VMS,
};
