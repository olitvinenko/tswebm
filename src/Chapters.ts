import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeaderData } from './ElementHeader';

export class Chapters {
    public readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public entries = [];
    public loaded = false;
    public tempEntry = null;
    public currentElement = null;

    public constructor(tagsHeader: ElementHeaderData, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = tagsHeader.offset;
        this.size = tagsHeader.size;
        this.end = tagsHeader.end;
    }

    public load(): boolean {
        return this.loaded;
    }
}
