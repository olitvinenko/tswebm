export interface ElementHeaderData {
    id: number;
    size: number;
    offset: number;
    dataOffset: number;
    end: number;
}

export class ElementHeader {
    public id: number;
    public size: number;
    public offset: number;
    public dataOffset: number;
    public end: number;
    public status: boolean = true;

    public constructor(id: number, size: number, offset: number, dataOffset: number) {
        this.id = id;
        this.size = size;
        //this.headerSize;
        this.offset = offset;
        this.dataOffset = dataOffset;
        this.end = dataOffset + size;
        this.status = true;
    }

    public init(id: number, size: number, offset: number, dataOffset: number): void {
        this.id = id;
        this.size = size;
        //this.headerSize;
        this.offset = offset;
        this.dataOffset = dataOffset;
        this.end = dataOffset + size;
        this.status = true;
    }

    public reset(): void {
        this.status = false;
    }

    public getData(): ElementHeaderData {
        return {
            id: this.id,
            size: this.size,
            offset: this.offset,
            dataOffset: this.dataOffset,
            end: this.end
        };
    }
}
