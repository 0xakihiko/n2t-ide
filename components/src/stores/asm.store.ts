import { Err, Ok, isErr } from "@davidsouther/jiffies/lib/esm/result.js";
import {
  KEYBOARD_OFFSET,
  SCREEN_OFFSET,
} from "@nand2tetris/simulator/cpu/memory.js";
import {
  ASM,
  Asm,
  fillLabel,
  isAValueInstruction,
  translateInstruction,
} from "@nand2tetris/simulator/languages/asm.js";
import { Span } from "@nand2tetris/simulator/languages/base.js";
import { bin } from "@nand2tetris/simulator/util/twos.js";
import { Dispatch, MutableRefObject, useContext, useMemo, useRef } from "react";
import { useImmerReducer } from "../react.js";
import { BaseContext } from "./base.context.js";

export interface TranslatorSymbol {
  name: string;
  value: string;
}

function defaultSymbols(): TranslatorSymbol[] {
  return [
    { name: "R0", value: "0" },
    { name: "R1", value: "1" },
    { name: "R2", value: "2" },
    { name: "...", value: "" }, // abbreviation of R3 - R14
    { name: "R15", value: "15" },
    { name: "SCREEN", value: SCREEN_OFFSET.toString() },
    { name: "KBD", value: KEYBOARD_OFFSET.toString() },
  ];
}

interface HighlightInfo {
  resultHighlight: Span | undefined;
  sourceHighlight: Span | undefined;
  highlightMap: Map<Span, Span>;
}

interface AsmVariable {
  name: string;
  isHidden: boolean;
}

class Translator {
  asm: Asm = { instructions: [] };
  current = -1;
  done = false;
  symbols: TranslatorSymbol[] = [];
  private variables: Map<number, AsmVariable> = new Map();
  private lines: string[] = [];
  lineNumbers: number[] = [];

  getResult() {
    return this.lines.join("\n");
  }

  load(asm: Asm, lineNum: number) {
    this.symbols = defaultSymbols();
    this.variables.clear();
    this.asm = asm;
    fillLabel(asm, (name, value, isVar) => {
      if (isVar) {
        this.variables.set(value, { name: name, isHidden: true });
      } else {
        this.symbols.push({ name: name, value: value.toString() });
      }
    });
    asm.instructions = asm.instructions.filter(({ type }) => type !== "L");

    this.resolveLineNumbers(lineNum);
    this.reset();
  }

  resolveLineNumbers(lineNum: number) {
    this.lineNumbers = Array(lineNum);
    let currentLine = 0;
    for (const instruction of this.asm.instructions) {
      if (
        (instruction.type === "A" || instruction.type === "C") &&
        instruction.span != undefined
      ) {
        this.lineNumbers[instruction.span.line] = currentLine;
        currentLine += 1;
      }
    }
  }

  step(highlightInfo: HighlightInfo) {
    if (this.current >= this.asm.instructions.length - 1) {
      return;
    }
    this.current += 1;
    const instruction = this.asm.instructions[this.current];
    if (instruction.type === "A" || instruction.type === "C") {
      highlightInfo.sourceHighlight = instruction.span;
      const result = translateInstruction(this.asm.instructions[this.current]);
      if (result === undefined) {
        return;
      }
      this.lines.push(`${bin(result)}`);
      highlightInfo.resultHighlight = {
        start: this.current * 17,
        end: (this.current + 1) * 17,
        line: -1,
      };

      if (highlightInfo.sourceHighlight) {
        highlightInfo.highlightMap.set(
          highlightInfo.sourceHighlight,
          highlightInfo.resultHighlight
        );
      }

      if (isAValueInstruction(instruction)) {
        const variable = this.variables.get(instruction.value);
        if (variable != undefined && variable.isHidden) {
          this.symbols.push({
            name: variable.name,
            value: instruction.value.toString(),
          });
          variable.isHidden = false;
        }
      }

      if (this.current === this.asm.instructions.length - 1) {
        this.done = true;
      }
    }
  }

  resetSymbols() {
    for (const variable of this.variables.values()) {
      variable.isHidden = true;
    }

    const variableNames = new Set(
      Array.from(this.variables.values()).map((v) => v.name)
    );
    this.symbols = this.symbols.filter(
      (symbol) => !variableNames.has(symbol.name)
    );
  }

  reset() {
    this.current = -1;
    this.lines = [];
    this.done = false;
    this.resetSymbols();
  }
}

export interface AsmPageState {
  asm: string;
  asmName: string | undefined;
  translating: boolean;
  current: number;
  resultHighlight: Span | undefined;
  sourceHighlight: Span | undefined;
  symbols: TranslatorSymbol[];
  result: string;
  compare: string;
  compareName: string | undefined;
  lineNumbers: number[];
}

export type AsmStoreDispatch = Dispatch<{
  action: keyof ReturnType<typeof makeAsmStore>["reducers"];
  payload?: unknown;
}>;

export function makeAsmStore(
  setStatus: (status: string) => void,
  dispatch: MutableRefObject<AsmStoreDispatch>
) {
  const translator = new Translator();
  const highlightInfo = {
    resultHighlight: undefined,
    sourceHighlight: undefined,
    highlightMap: new Map(),
  };
  let animate = true;
  let compiled = false;
  let translating = false;

  const reducers = {
    setAsm(
      state: AsmPageState,
      { asm, name }: { asm: string; name: string | undefined }
    ) {
      state.asm = asm;

      if (name) {
        state.asmName = name;
      }
    },

    setCmp(state: AsmPageState, { cmp, name }: { cmp: string; name: string }) {
      state.compare = cmp;
      state.compareName = name;
      setStatus("Loaded compare file");
    },

    update(state: AsmPageState) {
      state.translating = translating;
      state.current = translator.current;
      state.result = translator.getResult();
      state.symbols = Array.from(translator.symbols);
      state.lineNumbers = Array.from(translator.lineNumbers);
      state.sourceHighlight = highlightInfo.sourceHighlight;
      state.resultHighlight = highlightInfo.resultHighlight;
    },

    compare(state: AsmPageState) {
      const resultLines = state.result.split("\n");
      const compareLines = state.compare
        .split("\n")
        .filter((line) => line.trim() != "");

      if (resultLines.length != compareLines.length) {
        setStatus("Comparison failed - different lengths");
        return;
      }

      for (let i = 0; i < compareLines.length; i++) {
        for (let j = 0; j < compareLines[i].length; j++) {
          if (resultLines[i][j] !== compareLines[i][j]) {
            setStatus(`Comparison failed at ${i}:${j}`);
            state.resultHighlight = {
              start: i * 17,
              end: (i + 1) * 17,
              line: -1,
            };
            return;
          }
        }
      }
      setStatus("Comparison successful");
    },
  };

  const actions = {
    setAsm(asm: string, name?: string) {
      asm = asm.replace(/\r\n/g, "\n");
      dispatch.current({
        action: "setAsm",
        payload: { asm, name },
      });
      translating = false;
      this.compileAsm(asm);
    },

    compileAsm(asm: string) {
      this.reset();
      const parseResult = ASM.parse(asm);
      if (isErr(parseResult)) {
        setStatus(`Error parsing asm file - ${Err(parseResult).message}`);
        compiled = false;
        return;
      }

      translator.load(Ok(parseResult), asm.split("\n").length);
      compiled = translator.asm.instructions.length > 0;
      setStatus("");
      dispatch.current({ action: "update" });
    },

    setAnimate(value: boolean) {
      animate = value;
    },

    step(): boolean {
      if (compiled) {
        translating = true;
      }
      translator.step(highlightInfo);
      if (animate || translator.done) {
        dispatch.current({ action: "update" });
      }
      if (translator.done) {
        setStatus("Translation done.");
      }
      return translator.done;
    },

    updateHighlight(index: number, fromSource: boolean) {
      for (const [sourceSpan, resultSpan] of highlightInfo.highlightMap) {
        if (
          (fromSource &&
            sourceSpan.start <= index &&
            index <= sourceSpan.end) ||
          (!fromSource && resultSpan.start <= index && index <= resultSpan.end)
        ) {
          highlightInfo.sourceHighlight = sourceSpan;
          highlightInfo.resultHighlight = resultSpan;
        }
      }
      dispatch.current({ action: "update" });
    },

    resetHighlightInfo() {
      highlightInfo.sourceHighlight = undefined;
      highlightInfo.resultHighlight = undefined;
      highlightInfo.highlightMap.clear();
    },

    reset() {
      setStatus("Reset");
      translator.reset();
      this.resetHighlightInfo();
      dispatch.current({ action: "update" });
    },

    overrideState(state: AsmPageState) {
      this.resetHighlightInfo();
      this.setAsm(state.asm, state.asmName);
      dispatch.current({
        action: "setCmp",
        payload: { cmp: state.compare, name: state.compareName },
      });

      if (state.translating) {
        for (let i = 0; i <= state.current; i++) {
          this.step();
        }
      }

      dispatch.current({ action: "update" });
    },
  };

  const initialState: AsmPageState = {
    asm: "",
    asmName: undefined,
    translating: false,
    current: -1,
    resultHighlight: undefined,
    sourceHighlight: undefined,
    symbols: [],
    result: "",
    compare: "",
    compareName: undefined,
    lineNumbers: [],
  };

  return { initialState, reducers, actions };
}

export function useAsmPageStore() {
  const { setStatus } = useContext(BaseContext);

  const dispatch = useRef<AsmStoreDispatch>(() => undefined);

  const { initialState, reducers, actions } = useMemo(
    () => makeAsmStore(setStatus, dispatch),
    [setStatus, dispatch]
  );

  const [state, dispatcher] = useImmerReducer(reducers, initialState);
  dispatch.current = dispatcher;

  return { state, dispatch, actions };
}
