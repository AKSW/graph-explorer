import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';

import {
  Workspace,
  WorkspaceProps,
  SparqlDataProvider,
  SparqlQueryMethod,
  OWLRDFSSettings,
  SparqlDataProviderSettings,
} from '../src/graph-explorer/index';

import {
  ElementIri
} from '../src/graph-explorer/data/model';

import {
  onPageLoad,
  loadDiagram,
} from './common';

const CoyPuSettings: SparqlDataProviderSettings = {
  ...OWLRDFSSettings,
  ...{
     // filterTypePattern: `?instType rdfs:subClassOf* ?class . ?inst a ?instType `,
     defaultPrefix: `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
     `,
     dataLabelProperty: 'rdfs:label|skos:prefLabel',
     filterTypePattern: `?inst a/rdfs:subClassOf* ?class `,
     fullTextSearch: {
       prefix: 'PREFIX text: <http://jena.apache.org/text#>\n',
       queryPattern: `
                 (?inst ?score) text:query "\${text}".
           `,
     },
     classTreeQuery: `
       PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
       PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
       PREFIX owl:  <http://www.w3.org/2002/07/owl#>
       PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
     
       SELECT distinct ?class ?label ?parent WHERE {
         {
           ?class a owl:Class .
           OPTIONAL { ?class rdfs:label ?label } .
           OPTIONAL { ?class rdfs:subClassOf ?parent_ . filter(!isblank(?parent_)) . } .
           BIND(coalesce(?parent_, if(contains(str(?class),"/meta"), owl:MetaThing, owl:Thing)) AS ?parent) .
         } UNION {
           ?class a skos:Concept ;
                  skos:inScheme ?scheme .
           OPTIONAL { ?class skos:prefLabel ?label } .
           OPTIONAL { ?class skos:broader ?parent_ . filter(!isblank(?parent_)) . } .
           BIND(coalesce(?parent_, ?scheme) AS ?parent) .
         } UNION {
           { SELECT ?class SAMPLE(?label) {
               [] skos:inScheme ?class .
               OPTIONAL { ?class skos:prefLabel|rdfs:label ?label }
             } GROUP BY ?class } .
           BIND(skos:ConceptScheme AS ?parent) .
         }
       }`
  },
};

function queryInternalCoypu(params: {
  url: string;
  body?: string;
  headers: any;
  method: string;
}) {
  return fetch(params.url, {
    method: params.method,
    body: params.body,
    // @ts-expect-error
    credentials: '@FETCH_CREDENTIALS@',
    mode: 'cors',
    cache: 'default',
    headers: params.headers,
  });
}

function onWorkspaceMounted(workspace: Workspace) {
  if (!workspace) {
    return;
  }

  const dataProvider = new SparqlDataProvider(
    {
      endpointUrl: '@ENDPOINT_URL@',
      queryFunction: queryInternalCoypu,
      imagePropertyUris: [
        'http://xmlns.com/foaf/0.1/depiction',
        'http://xmlns.com/foaf/0.1/img',
      ],
      queryMethod: SparqlQueryMethod.POST,
    },
    {...CoyPuSettings,
     ...{
     }
    }
  );

  loadDiagram(workspace, dataProvider);
}

const props: WorkspaceProps & ClassAttributes<Workspace> = {
  ref: onWorkspaceMounted,
  viewOptions: {
    onIriClick: ({ iri }) => window.open(iri),
  },
};

onPageLoad((container) => {
  ReactDOM.render(createElement(Workspace, props), container);
});
