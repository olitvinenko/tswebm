export class Track {
    [key: string]: any;

    public loadMeta(meta: any): void {
        for (const key in meta) {
            this[key] = meta[key];
        }
    }
}
