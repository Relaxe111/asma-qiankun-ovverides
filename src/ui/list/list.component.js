import { h, Component, render } from "preact";
import ModuleDialog from "./module-dialog.component";
import { devLibs } from "../dev-lib-overrides.component";

export default class List extends Component {
  state = {
    notOverriddenMap: { imports: {} },
    currentPageMap: { imports: {} },
    nextPageMap: { imports: {} },
    dialogModule: null,
    dialogExternalMap: null,
    searchVal: "",
  };
  componentDidMount() {
    this.setState({ 
      notOverriddenMap: window.importMapOverrides.getDefaultMap(),
      currentPageMap: window.importMapOverrides.getCurrentPageMap(),
      nextPageMap: window.importMapOverrides.getNextPageMap()
    })
    window.addEventListener("import-map-overrides:change", this.doUpdate);
    this.inputRef.focus();
  }
  componentWillUnmount() {
    window.removeEventListener("import-map-overrides:change", this.doUpdate);
  }
  componentDidUpdate(prevProps, prevState) {
    if (!prevState.dialogModule && this.state.dialogModule) {
      this.dialogContainer = document.createElement("div");
      document.body.appendChild(this.dialogContainer);
      render(
        <ModuleDialog
          module={this.state.dialogModule}
          cancel={this.cancel}
          updateModuleUrl={this.updateModuleUrl}
          addNewModule={this.addNewModule}
        />,
        this.dialogContainer
      );
    } else if (prevState.dialogModule && !this.state.dialogModule) {
      render(null, this.dialogContainer);
      this.dialogContainer.remove();
      delete this.dialogContainer;
    }
  }
  render() {
    const overriddenModules = [],
      nextOverriddenModules = [],
      disabledOverrides = [],
      defaultModules = [],
      externalOverrideModules = [],
      pendingRefreshDefaultModules = [],
      devLibModules = [];

    const overrideMap = window.importMapOverrides.getOverrideMap(true).imports;

    const notOverriddenKeys = Object.keys(this.state.notOverriddenMap.imports);

    const disabledModules = window.importMapOverrides.getDisabledOverrides();

    notOverriddenKeys.filter(this.filterModuleNames).forEach((moduleName) => {
      const mod = {
        moduleName,
        defaultUrl: this.state.notOverriddenMap.imports[moduleName],
        overrideUrl: overrideMap[moduleName],
        disabled: disabledModules.includes(moduleName),
      };
      if (mod.disabled) {
        disabledOverrides.push(mod);
      } else if (overrideMap[moduleName]) {
        if (
          this.state.currentPageMap.imports[moduleName] ===
          overrideMap[moduleName]
        ) {
          if (
            devLibs[moduleName] &&
            devLibs[moduleName](
              this.state.currentPageMap.imports[moduleName]
            ) === overrideMap[moduleName]
          ) {
            devLibModules.push(mod);
          } else {
            overriddenModules.push(mod);
          }
        } else {
          nextOverriddenModules.push(mod);
        }
      } else if (
        this.state.notOverriddenMap.imports[moduleName] ===
        this.state.currentPageMap.imports[moduleName]
      ) {
        defaultModules.push(mod);
      } else if (
        this.state.notOverriddenMap.imports[moduleName] ===
        this.state.nextPageMap.imports[moduleName]
      ) {
        pendingRefreshDefaultModules.push(mod);
      } else {
        externalOverrideModules.push(mod);
      }
    });

    Object.keys(overrideMap)
      .filter(this.filterModuleNames)
      .forEach((moduleName) => {
        if (!notOverriddenKeys.includes(moduleName)) {
          const mod = {
            moduleName,
            defaultUrl: null,
            overrideUrl: overrideMap[moduleName],
            disabled: disabledModules.includes(moduleName),
          };

          if (mod.disabled) {
            disabledOverrides.push(mod);
          } else if (
            this.state.currentPageMap.imports[moduleName] ===
            overrideMap[moduleName]
          ) {
            overriddenModules.push(mod);
          } else {
            nextOverriddenModules.push(mod);
          }
        }
      });

    overriddenModules.sort(sorter);
    defaultModules.sort(sorter);
    nextOverriddenModules.sort(sorter);

    return (
      <div className="imo-list-container">
        <div className="imo-table-header-actions">
          <input
            className="imo-list-search"
            aria-label="Search modules"
            placeholder="Search modules"
            value={this.state.searchVal}
            onInput={(evt) => this.setState({ searchVal: evt.target.value })}
            ref={(ref) => (this.inputRef = ref)}
          />
          <div className="imo-add-new">
            <button onClick={() => window.importMapOverrides.resetOverrides()}>
              Reset all overrides
            </button>
          </div>
        </div>
        <table className="imo-overrides-table">
          <thead>
            <tr>
              <th>Module Status</th>
              <th>Module Name</th>
              <th>Entry</th>
            </tr>
          </thead>
          <tbody>
            {nextOverriddenModules.map((mod) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() => this.setState({ dialogModule: mod })}
                key={mod.moduleName}
              >
                <td>
                  <div className="imo-status imo-next-override" />
                  <div>Inline Override</div>
                  <div className="imo-needs-refresh" />
                </td>
                <td>{mod.moduleName}</td>
                <td>{toUrlStr(mod)}</td>
              </tr>
            ))}
            {pendingRefreshDefaultModules.map((mod) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() => this.setState({ dialogModule: mod })}
                key={mod.moduleName}
              >
                <td style={{ position: "relative" }}>
                  <div className="imo-status imo-next-default" />
                  <div>Default</div>
                  <div className="imo-needs-refresh" />
                </td>
                <td>{mod.moduleName}</td>
                <td>{toUrlStr(mod)}</td>
              </tr>
            ))}
            {disabledOverrides.map((mod) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() => this.setState({ dialogModule: mod })}
                key={mod.moduleName}
              >
                <td>
                  <div className="imo-status imo-disabled-override" />
                  <div>Override disabled</div>
                </td>
                <td>{mod.moduleName}</td>
                <td>{toUrlStr(mod)}</td>
              </tr>
            ))}
            {overriddenModules.map((mod) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() => this.setState({ dialogModule: mod })}
                key={mod.moduleName}
              >
                <td>
                  <div className="imo-status imo-current-override" />
                  <div>Inline Override</div>
                </td>
                <td>{mod.moduleName}</td>
                <td>{toUrlStr(mod)}</td>
              </tr>
            ))}
            {externalOverrideModules.map((mod) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() => this.setState({ dialogModule: mod })}
                key={mod.moduleName}
              >
                <td>
                  <div className="imo-status imo-external-override" />
                  <div>External Override</div>
                </td>
                <td>{mod.moduleName}</td>
                <td>{toUrlStr(mod)}</td>
              </tr>
            ))}
            {devLibModules.map((mod) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() => this.setState({ dialogModule: mod })}
                key={mod.moduleName}
                title="Automatically use dev version of certain npm libs"
              >
                <td>
                  <div className="imo-status imo-dev-lib-override" />
                  <div>Dev Lib Override</div>
                </td>
                <td>{mod.moduleName}</td>
                <td>{toUrlStr(mod)}</td>
              </tr>
            ))}
            {defaultModules.map((mod) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() => this.setState({ dialogModule: mod })}
                key={mod.moduleName}
              >
                <td>
                  <div className="imo-status imo-default-module" />
                  <div>Default</div>
                </td>
                <td>{mod.moduleName}</td>
                <td>{toUrlStr(mod)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  cancel = () => {
    this.setState({ dialogModule: null, dialogExternalMap: null });
  };

  updateModuleUrl = (newUrl) => {
    newUrl = newUrl || null;

    if (newUrl === null) {
      window.importMapOverrides.removeOverride(
        this.state.dialogModule.moduleName
      );
    } else {
      window.importMapOverrides.addOverride(
        this.state.dialogModule.moduleName,
        newUrl
      );
    }

    this.setState({ dialogModule: null });
  };

  doUpdate = () => {
    this.forceUpdate();
    this.setState({ nextPageMap: window.importMapOverrides.getNextPageMap() })
  };

  addNewModule = (name, url) => {
    if (name && url) {
      window.importMapOverrides.addOverride(name, url);
    }
    this.setState({ dialogModule: null });
  };

  filterModuleNames = (moduleName) => {
    return this.state.searchVal.trim().length > 0
      ? moduleName.includes(this.state.searchVal)
      : true;
  };
}

function sorter(first, second) {
  return first.moduleName > second.moduleName;
}

const currentBase =
  (document.querySelector("base") && document.querySelector("base").href) ||
  location.origin + "/";

function toUrlStr(mod) {
  return mod.overrideUrl || mod.defaultUrl;
}

function toURL(urlStr) {
  try {
    return new URL(urlStr, currentBase);
  } catch {
    return null;
  }
}
