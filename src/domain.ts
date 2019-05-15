interface Config {
  padding: number
  stroke: string
  font: string
  title: string
  leading: number
  fontSize: number
  lineWidth: number
  gutter: number
  styles: { [key: string]: Style }
  fill: string[]
  edges: string
  edgeMargin: number
  spacing: number
  direction: 'TB'|'LR'
  fillArrows: boolean
  arrowSize: number
  bendSize: number
  zoom: number
}

interface Measurer {
    setFont(config: Config, isBold: 'bold'|'normal', isItalic:'italic'|'normal'): void
    textWidth(text: string): number
    textHeight(): number
}

interface Visualizer {
  (node: nomnoml.Classifier, x: number, y: number, config: Config, g: Graphics): void
}

type HullType = 'icon'|'empty'|'auto'

interface Style {
  bold: boolean
  underline: boolean
  italic: boolean
  dashed: boolean
  empty: boolean
  center: boolean
  fill: string|undefined
  stroke: string|undefined
  visual: string
  direction: 'TB'|'LR'
  hull: HullType
}
namespace nomnoml {

  export class NullStyle implements Style {
    bold: boolean = true
    underline: boolean = false
    italic: boolean = false
    dashed: boolean = false
    empty: boolean = false
    center: boolean = false
    fill: string|undefined = undefined
    stroke: string|undefined = undefined
    visual: string = 'class'
    direction: 'TB'|'LR' = 'TB'
    hull: HullType = 'auto'
    constructor(conf: { stroke: string }) {
      this.stroke = conf.stroke
    }
  }

  export class Compartment {
    width: number
    height: number
    constructor(
      public lines: string[], 
      public nodes: Classifier[], 
      public relations: Relation[]
    ){}
  }

  export class Relation {
    id: number
    path?: Vector[]
    start: string
    end: string
    startLabel: string
    endLabel: string
    assoc: string
  }

  export class Classifier implements Vec {
    x: number
    y: number
    width: number
    height: number
    layoutWidth: number
    layoutHeight: number
    constructor(
      public type: string,
      public name: string,
      public compartments: Compartment[]
    ){}
  }
}
