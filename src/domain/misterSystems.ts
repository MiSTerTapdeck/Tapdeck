type ListedSystem={id:string;name:string;zapScript?:string};

// Zaparoo 2.20 also lists virtual core launch targets. Their opaque IDs are
// accepted for launching, but not by media.generate or media.scrape.
// Do not filter on mediaCount: new indexable systems can have no games yet.
export function indexableMiSTerSystems<T extends ListedSystem>(systems:T[]):T[]{
 return systems.filter(system=>!!system.id&&!!system.name&&!system.zapScript?.startsWith('zaparoo://'));
}
