export type IdeFile = {
  path: string;
  language: string;
  content: string;
};

export type IdeTreeNode =
  | {
      kind: "directory";
      name: string;
      path: string;
      children: IdeTreeNode[];
    }
  | {
      kind: "file";
      name: string;
      path: string;
      language: string;
    };

export type IdeSourceEnumerationOptions = {
  basePath?: string;
  exclude?: RegExp;
};
