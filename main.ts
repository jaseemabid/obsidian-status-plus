import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
	moment,
	setIcon,
} from "obsidian";

interface PlusSettings {
	ctime: boolean;
	mtime: boolean;
	debug: boolean;
}

const DEFAULT_SETTINGS: PlusSettings = {
	ctime: true,
	mtime: true,
	debug: true,
};

export default class StatusPlus extends Plugin {
	settings: PlusSettings;
	elem: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.log(`onload`);

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		this.elem = this.addStatusBarItem();

		// TODO: this.app.vault.on("create", this.render) doesn't work, figure out why.
		// TODO: Read https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
		// TODO: Read https://www.typescriptlang.org/docs/handbook/2/classes.html#this-at-runtime-in-classes

		// Vault events:     create | modify | delete | rename | closed
		// Workspace events: file-open | active-leaf-change

		this.registerEvent(
			this.app.vault.on("modify", (f) => {
				if (f instanceof TFile && f == this.app.workspace.getActiveFile()) {
					this.render("modify", f);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-open", (f) => {
				if (f !== null) {
					this.render("file-open", f);
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
				const typ = leaf.getViewState().type;

				switch (typ) {
					case "file-explorer":
						this.clear(`focus-${typ}`);
						break;
					case "markdown":
						const f = this.app.workspace.getActiveFile();
						if (f !== null) {
							this.render("focus", f);
						}
						break;
					case "empty":
						this.clear("empty");
						break;
					default:
						this.log(`Unknown leaf change event`, typ);
				}
			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PlusSettingTab(this.app, this));
	}

	onunload() {
		this.log("Good bye, onunload");
		this.clear("unload");
	}

	render(event: string, f: TFile) {
		// TODO: Debounce this.
		// TODO: Handle TFolder
		// TODO: Handle injection attacks

		this.log(`Render event:'${event}'`, f);

		let ctime = moment(f.stat.ctime).fromNow();
		let mtime = moment(f.stat.mtime).fromNow();

		// Set icon only once. The icon gets appended, pushing it to be on the right side.
		if (!this.elem.hasChildNodes()) {
			setIcon(this.elem, "file-clock");
		}

		let container = this.elem.find("div") || this.elem.createDiv({ cls: "what" });

		const html = `
			<div>
				<span class="status-bar-item"> Created ${ctime}  </span>
				<span class="status-bar-item"> Modified ${mtime} </span>
			</div>
		`;

		container.innerHTML = html;
	}

	// Clear the status bar element with a log
	clear(event: string) {
		this.log(`[Status Plus] Clear event:'${event}'`);
		this.elem.empty();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	log(..._: any) {
		// 1. Convert args to a normal array
		var args = Array.prototype.slice.call(arguments);

		// 2. Prepend log prefix log string
		args.unshift("[Status Plus] ");

		// 3. Pass along arguments to console.log
		if (this.settings.debug) {
			console.log.apply(console, args);
		}
	}
}

class PlusSettingTab extends PluginSettingTab {
	plugin: StatusPlus;

	constructor(app: App, plugin: StatusPlus) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Settings for Status Plus" });

		new Setting(containerEl)
			.setName("Enable ctime")
			.setDesc("Show created time")
			.addToggle((checked) =>
				checked.setValue(this.plugin.settings.ctime).onChange(async (value) => {
					this.plugin.settings.ctime = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Enable mtime")
			.setDesc("Show modified time")
			.addToggle((checked) =>
				checked.setValue(this.plugin.settings.mtime).onChange(async (value) => {
					this.plugin.settings.mtime = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl).setName("Enable debug logs").addToggle((checked) =>
			checked.setValue(this.plugin.settings.debug).onChange(async (value) => {
				this.plugin.settings.debug = value;
				await this.plugin.saveSettings();
			})
		);
	}
}
