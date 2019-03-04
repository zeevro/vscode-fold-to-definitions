import * as vscode from 'vscode';

let KINDS_TO_FOLD = [vscode.SymbolKind.Method, vscode.SymbolKind.Property, vscode.SymbolKind.Constructor, vscode.SymbolKind.Function, vscode.SymbolKind.Operator];
let KINDS_TO_FOLD_CLASSES = [vscode.SymbolKind.Class, vscode.SymbolKind.Interface];

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.fold_to_definitions', foldToDefinitions));
	context.subscriptions.push(vscode.commands.registerCommand('extension.fold_to_class_definitions', foldToClassDefinitions));
}

export function deactivate() {}

function foldToClassDefinitions() {
	foldToDefinitions(true);
}

function foldToDefinitions(classes: boolean = false) {
	const activeEditor = vscode.window.activeTextEditor;

	if (activeEditor === undefined) {
		return;
	}

	vscode.commands.executeCommand<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", activeEditor.document.uri).then(
		function (symbols: vscode.DocumentSymbol[] | undefined) {
			//console.log("symbols", symbols);

			if (symbols === undefined) {
				return;
			}

			let allSymbols: vscode.DocumentSymbol[] = [];
			populateAllSymbols(symbols, allSymbols);

			let kinds = KINDS_TO_FOLD;
			if (classes) {
				kinds = kinds.concat(KINDS_TO_FOLD_CLASSES);
			}

			allSymbols = allSymbols.filter(symbol => {
				return kinds.includes(symbol.kind);
			});

			allSymbols = allSymbols.filter(symbol => {
				return !symbol.range.isSingleLine;
			});

			allSymbols.sort((a, b) => {
				return b.range.start.line - a.range.start.line;
			});

			//console.log("allSymbols", symbols);

			actuallyFold(activeEditor, allSymbols);
		}
	);
}

function populateAllSymbols(source: vscode.DocumentSymbol[], dest: vscode.DocumentSymbol[]) {
	for (let symbol of source) {
		dest.push(symbol);
		if (symbol.children) {
			populateAllSymbols(symbol.children, dest);
		}
	}
}

async function actuallyFold(activeEditor: vscode.TextEditor, symbols: vscode.DocumentSymbol[]) {
	let original_selection = activeEditor.selection;

	await vscode.commands.executeCommand("editor.unfoldAll");

	for (let symbol of symbols) {
		let symbolLocation = symbol.selectionRange.start;
		console.log("Folding", vscode.SymbolKind[symbol.kind], symbol.name, "in line", symbolLocation.line + 1, "character", symbolLocation.character + 1);
		activeEditor.selection = new vscode.Selection(symbolLocation, symbolLocation);
		
		if (symbol.range.contains(original_selection)) {
			original_selection = activeEditor.selection;
		}
		await vscode.commands.executeCommand("editor.fold");
	}

	activeEditor.selection = original_selection;
}