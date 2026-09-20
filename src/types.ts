import type { TFile } from "obsidian";

export enum RelationType {
  DEFINED = 1,
  INFERRED = 2
}

export enum LinkDirection {
  TO = 1,
  FROM = 2,
  BOTH = 3
}

export type Role = "parent" | "child" | "left" | "right" | "previous" | "next" | "sibling";
export type GateSide = "top" | "bottom" | "left" | "right";
export type StrokeStyle = "solid" | "dashed" | "dotted";
export type FillStyle = "solid" | "hachure" | "cross-hatch";
export type Arrowhead = "none" | "arrow" | "bar" | "dot" | "triangle";

export type Hierarchy = {
  hidden: string[];
  parents: string[];
  children: string[];
  leftFriends: string[];
  rightFriends: string[];
  previous: string[];
  next: string[];
  exclusions: string[];
  friends?: string[];
};

export type NodeStyle = {
  prefix?: string;
  backgroundColor?: string;
  fillStyle?: FillStyle;
  textColor?: string;
  borderColor?: string;
  fontSize?: number;
  fontFamily?: number;
  maxLabelLength?: number;
  roughness?: number;
  strokeShaprness?: "round" | "sharp";
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  padding?: number;
  gateRadius?: number;
  gateOffset?: number;
  gateStrokeColor?: string;
  gateBackgroundColor?: string;
  gateFillStyle?: FillStyle;
  embedWidth?: number;
  embedHeight?: number;
};

export type LinkStyle = {
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: StrokeStyle;
  roughness?: number;
  startArrowHead?: Arrowhead;
  endArrowHead?: Arrowhead;
  showLabel?: boolean;
  fontSize?: number;
  fontFamily?: number;
  textColor?: string;
};

export type Relation = {
  target: GraphPage;
  direction: LinkDirection | null;
  isHidden: boolean;
  isParent: boolean;
  parentType?: RelationType;
  parentTypeDefinition?: string;
  isChild: boolean;
  childType?: RelationType;
  childTypeDefinition?: string;
  isLeftFriend: boolean;
  leftFriendType?: RelationType;
  leftFriendTypeDefinition?: string;
  isRightFriend: boolean;
  rightFriendType?: RelationType;
  rightFriendTypeDefinition?: string;
  isNextFriend: boolean;
  nextFriendType?: RelationType;
  nextFriendTypeDefinition?: string;
  isPreviousFriend: boolean;
  previousFriendType?: RelationType;
  previousFriendTypeDefinition?: string;
};

export type GraphPage = {
  path: string;
  file: TFile | null;
  name: string;
  url: string | null;
  isFolder: boolean;
  isTag: boolean;
  mtime: number | null;
  neighbours: Map<string, Relation>;
  aliases: string[];
  tags: string[];
  primaryStyleTag: string | null;
  styleTags: string[];
  frontmatter: Record<string, unknown>;
  inlineFields: Record<string, unknown[]>;
  maxLabelLength: number;
};

export type Neighbour = {
  page: GraphPage;
  relationType: RelationType;
  typeDefinition?: string;
  linkDirection: LinkDirection | null;
  role: Role;
};

export type Neighborhood = {
  center: GraphPage;
  parents: Neighbour[];
  children: Neighbour[];
  leftFriends: Neighbour[];
  rightFriends: Neighbour[];
  siblings: Neighbour[];
};

export type PositionedNode = {
  page: GraphPage;
  role: Role | "center";
  relationType?: RelationType;
  typeDefinition?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: NodeStyle;
  label: string;
  neighbourCount: number;
};

export type PositionedEdge = {
  id: string;
  sourcePath: string;
  targetPath: string;
  role: Role;
  relationType: RelationType;
  typeDefinition?: string;
  direction: LinkDirection | null;
  style: LinkStyle;
};
