import { basename, dirname, fromFileUrl, join, relative, resolve } from '@std/path';
import ts from 'npm:typescript@5.8.3';

type ParsedArgs = {
  root: string;
  out: string;
  importSource?: string;
};

type ImportBinding = {
  localName: string;
  specifier: string;
};

type ClassReference = {
  name: string;
  sourceFile: string;
  importSpecifier: string;
};

type DependencyEntry = {
  target: ClassReference;
  dependencies: ClassReference[];
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const scriptDir = dirname(fromFileUrl(import.meta.url));
const packageRoot = resolve(scriptDir, '..');

const isExportedClass = (node: ts.ClassDeclaration): boolean => {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
};

const isIgnoredPath = (path: string): boolean => {
  const normalized = path.replaceAll('\\', '/');

  return normalized.includes('/.git/') || normalized.includes('/.vscode/') || normalized.includes('/node_modules/') || normalized.endsWith('.test.ts') || normalized.endsWith('.generated.ts') || normalized.endsWith('/oakest.di.generated.ts');
};

const parseArgs = (args: string[]): ParsedArgs => {
  let root = '.';
  let out = './oakest.di.generated.ts';
  let importSource: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--root') {
      root = args[index + 1] || root;
      index += 1;
    } else if (arg === '--out') {
      out = args[index + 1] || out;
      index += 1;
    } else if (arg === '--import-source') {
      importSource = args[index + 1] || importSource;
      index += 1;
    }
  }

  return {
    root: resolve(Deno.cwd(), root),
    out: resolve(Deno.cwd(), out),
    importSource,
  };
};

const collectTsFiles = async (root: string): Promise<string[]> => {
  const files: string[] = [];

  for await (const entry of Deno.readDir(root)) {
    const fullPath = join(root, entry.name);

    if (isIgnoredPath(fullPath)) {
      continue;
    }

    if (entry.isDirectory) {
      files.push(...await collectTsFiles(fullPath));
      continue;
    }

    if (entry.isFile && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
};

const normalizeImportPath = (fromPath: string, toPath: string): string => {
  let relativePath = relative(dirname(fromPath), toPath).replaceAll('\\', '/');

  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
};

const getTypeIdentifier = (typeNode: ts.TypeNode | undefined): string | undefined => {
  if (!typeNode || !ts.isTypeReferenceNode(typeNode)) {
    return undefined;
  }

  const typeName = typeNode.typeName;

  if (ts.isIdentifier(typeName)) {
    return typeName.text;
  }

  return undefined;
};

const getImportBindings = (sourceFile: ts.SourceFile): Map<string, ImportBinding> => {
  const bindings = new Map<string, ImportBinding>();

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node) || !node.importClause || !ts.isStringLiteral(node.moduleSpecifier)) {
      return;
    }

    const specifier = node.moduleSpecifier.text;
    const namedBindings = node.importClause.namedBindings;

    if (node.importClause.name) {
      bindings.set(node.importClause.name.text, {
        localName: node.importClause.name.text,
        specifier,
      });
    }

    if (namedBindings && ts.isNamedImports(namedBindings)) {
      namedBindings.elements.forEach((element) => {
        bindings.set(element.name.text, {
          localName: element.name.text,
          specifier,
        });
      });
    }
  });

  return bindings;
};

const getLocalClassNames = (sourceFile: ts.SourceFile): Set<string> => {
  const classNames = new Set<string>();

  sourceFile.forEachChild((node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      classNames.add(node.name.text);
    }
  });

  return classNames;
};

const getDependencyEntries = (sourcePath: string, sourceFile: ts.SourceFile): DependencyEntry[] => {
  const importBindings = getImportBindings(sourceFile);
  const localClassNames = getLocalClassNames(sourceFile);
  const entries: DependencyEntry[] = [];

  sourceFile.forEachChild((node) => {
    if (!ts.isClassDeclaration(node) || !node.name) {
      return;
    }

    if (!isExportedClass(node)) {
      return;
    }

    const constructorDecl = node.members.find((member) => ts.isConstructorDeclaration(member));

    if (!constructorDecl || !ts.isConstructorDeclaration(constructorDecl)) {
      return;
    }

    const dependencies: ClassReference[] = [];

    constructorDecl.parameters.forEach((parameter) => {
      const typeName = getTypeIdentifier(parameter.type);

      if (!typeName) {
        return;
      }

      if (localClassNames.has(typeName)) {
        dependencies.push({
          name: typeName,
          sourceFile: sourcePath,
          importSpecifier: normalizeImportPath(sourcePath, sourcePath),
        });
        return;
      }

      const binding = importBindings.get(typeName);

      if (!binding) {
        return;
      }

      dependencies.push({
        name: binding.localName,
        sourceFile: sourcePath,
        importSpecifier: binding.specifier,
      });
    });

    if (dependencies.length === 0) {
      return;
    }

    entries.push({
      target: {
        name: node.name.text,
        sourceFile: sourcePath,
        importSpecifier: normalizeImportPath(sourcePath, sourcePath),
      },
      dependencies,
    });
  });

  return entries;
};

const buildGeneratedFile = (entries: DependencyEntry[], outputPath: string, importSource?: string): string => {
  const importLines = new Map<string, Set<string>>();
  const registryImportSpecifier = importSource || (outputPath.startsWith(packageRoot) ? normalizeImportPath(outputPath, join(packageRoot, 'mod.ts')) : '@dx/oakest');

  const addImport = (specifier: string, name: string): void => {
    if (!importLines.has(specifier)) {
      importLines.set(specifier, new Set<string>());
    }

    importLines.get(specifier)!.add(name);
  };

  const registerCalls = entries.map((entry) => {
    const targetSpecifier = normalizeImportPath(outputPath, entry.target.sourceFile);
    addImport(targetSpecifier, entry.target.name);

    entry.dependencies.forEach((dependency) => {
      const dependencySpecifier = dependency.importSpecifier.startsWith('.') ? normalizeImportPath(outputPath, resolve(dirname(entry.target.sourceFile), dependency.importSpecifier)) : dependency.importSpecifier;

      addImport(dependencySpecifier, dependency.name);
    });

    const dependencyNames = entry.dependencies.map((dependency) => dependency.name).join(', ');

    return `registerDependencies(${entry.target.name}, [${dependencyNames}]);`;
  });

  addImport(registryImportSpecifier, 'registerDependencies');

  const imports = [...importLines.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([specifier, names]) => `import { ${[...names].sort().join(', ')} } from '${specifier}';`)
    .join('\n');

  const body = registerCalls.join('\n');

  return `// This file is generated by tools/generate-di-registry.ts\n${imports}\n\n${body}\n`;
};

const main = async (): Promise<void> => {
  const { root, out, importSource } = parseArgs(Deno.args);
  const files = (await collectTsFiles(root)).sort();
  const entries: DependencyEntry[] = [];

  for (const file of files) {
    const source = decoder.decode(await Deno.readFile(file));
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    entries.push(...getDependencyEntries(file, sourceFile));
  }

  const generated = buildGeneratedFile(entries, out, importSource);

  await Deno.mkdir(dirname(out), { recursive: true });
  await Deno.writeFile(out, encoder.encode(generated));
  console.log(`Generated ${basename(out)} with ${entries.length} dependency registrations.`);
};

if (import.meta.main) {
  await main();
}
