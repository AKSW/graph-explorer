import {
  Workspace,
  ElementIri,
  Link,
  SerializedDiagram,
  convertToSerializedDiagram,
  DataProvider,
} from '../src/graph-explorer/index';

export function onPageLoad(callback: (container: HTMLDivElement) => void) {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
    callback(container);
  });
}

export function tryLoadLayoutFromLocalStorage(): SerializedDiagram | undefined {
  if (window.location.hash.length > 1) {
    try {
      const key = window.location.hash.substring(1);
      const unparsedLayout = localStorage.getItem(key);
      const entry = unparsedLayout && JSON.parse(unparsedLayout);
      if (!entry && key.charAt(0) !== '!' && key.charAt(1) !== '=') {
        alert(`The diagram ‘${key}’ was not found in your browser's local storage.`);
      }

      // backward compatibility test. If we encounder old diagram,
      // wrap it into Diagram interface, jsonld - pass through
      if (entry['@context']) {
        return entry;
      } else {
        return convertToSerializedDiagram({
          layoutData: entry,
          linkTypeOptions: [],
        });
      }
    } catch (e) {
      /* ignore */
    }
  }
  return undefined;
}

export function tryLoadFromCloudStorage(): Promise<SerializedDiagram | undefined> {
  if (window.location.hash.length > 2 && window.location.hash.slice(0, 2) === '#!') {
    const remote = window.location.hash.slice(2);
    return fetch('https://diagramstore.aksw.org/' + remote)
      .then((res) => res.json())
      .catch((e) => {
        alert(`The diagram ‘${remote.substring(0, 8) + (remote.length > 8 ? '…' : '')}’ was not found in the cloud storage.`);
      });
  }
  return Promise.resolve(undefined);
}

export function tryLoadFromNamedResources(workspace: Workspace): void {
  if (window.location.hash.length > 3 && window.location.hash.slice(0, 3) === '#r=') {
    const remote = window.location.hash.slice(3);

    if (remote) {
      const model = workspace.getModel();
      const iris = remote.split(';') as ElementIri[];
      model.dataProvider.elementInfo({ elementIds: iris })
        .then((em) => {
          const ids = new Map<string, string>();
          iris.forEach((iri) => {
            const node = model.createElement(em[iri]);
            ids.set(iri, node.id);
          });
          workspace.forceLayout();
          return ids;
        }).then((ids) => {
          /* now that we have the resources, add the links */
          model.dataProvider
            .linksInfo({ elementIds: iris, linkTypeIds: [] })
            .then((lm) => {
              lm.forEach((link) => {
                const newLink = new Link({
                  typeId: link.linkTypeId,
                  sourceId: ids.get(link.sourceId),
                  targetId: ids.get(link.targetId)
                });
                model.addLink(newLink);
              });
              workspace.forceLayout();
            });
        });
    }
  }
}

export function loadDiagram(workspace: Workspace, dataProvider: DataProvider): void {
  const localDiagram = tryLoadLayoutFromLocalStorage();
  let next = localDiagram ? Promise.resolve(localDiagram) : tryLoadFromCloudStorage();
  next.then((diagram) => {
    workspace.getModel().importLayout({
      diagram,
      validateLinks: true,
      dataProvider
    });
    if (!diagram) {
      tryLoadFromNamedResources(workspace);
    }
  });
}

export function saveLayoutToLocalStorage(diagram: SerializedDiagram): string {
  const randomKey = Math.floor((1 + Math.random()) * 0x10000000000)
    .toString(16)
    .substring(1);
  localStorage.setItem(randomKey, JSON.stringify(diagram));
  return randomKey;
}
