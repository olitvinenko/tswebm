import { ElementHeader } from './ElementHeader';
import { SimpleBlock } from './SimpleBlock';
import { BlockGroup } from './BlockGroup';
import { JsWebm } from './JsWebm';
import { DataInterface } from './DataInterface/DataInterface';

export class Cluster {
    public readonly demuxer: JsWebm;
    public readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public dataOffset: number;
    public loaded = false;
    public tempEntry = null;
    public currentElement = null;
    public timeCode: number | null = null;
    public tempBlock: any = null;
    public position = null;
    public tempElementHeader;

    public blockGroups: any[] = [];

    public currentBlockGroup: any;
    public currentTag: any;
    public prevSize: any;

    public constructor(
        offset: number,
        size: number,
        end: number,
        dataOffset: number,
        dataInterface: DataInterface,
        demuxer: JsWebm
    ) {
        this.demuxer = demuxer; // reference to parent demuxer for passing data
        this.dataInterface = dataInterface;
        this.offset = offset;
        this.size = size;
        //if (end !== -1){
        this.end = end;
        //}
        //else{
        //  this.end = Number.MAX_VALUE;
        //}
        this.dataOffset = dataOffset;
        this.loaded = false;
        this.tempEntry = null;
        this.currentElement = null;
        this.tempBlock = null;
        this.position = null;
        this.tempElementHeader = new ElementHeader(-1, -1, -1, -1);
        this.tempElementHeader.reset();
        this.tempBlock = new SimpleBlock();
        this.blockGroups = [];
        //this.demuxer.loadedMetadata = true; // Testing only
    }

    public init(): void {}

    public reset(): void {}

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.tempElementHeader.status) {
                this.dataInterface.peekAndSetElement(this.tempElementHeader);
                if (!this.tempElementHeader.status) return false;
            }
            switch (this.tempElementHeader.id) {
                case 0xe7: {
                    // TimeCode
                    const timeCode = this.dataInterface.readUnsignedInt(this.tempElementHeader.size);
                    if (timeCode !== null) {
                        this.timeCode = timeCode;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0xa3: {
                    // Simple Block
                    if (!this.tempBlock.status)
                        this.tempBlock.init(
                            this.tempElementHeader.offset,
                            this.tempElementHeader.size,
                            this.tempElementHeader.end,
                            this.tempElementHeader.dataOffset,
                            this.dataInterface,
                            this
                        );
                    this.tempBlock.load();
                    if (!this.tempBlock.loaded) return true;
                    // else
                    // this.blocks.push(this.tempBlock); //Later save positions for seeking and debugging
                    this.tempBlock.reset();
                    this.tempEntry = null;
                    this.tempElementHeader.reset();
                    if (this.dataInterface.offset !== this.end) {
                        if (!this.dataInterface.currentBuffer) return false;
                        return true;
                    }
                    break;
                }
                case 0xa7: {
                    // Position
                    const timeCode = this.dataInterface.readUnsignedInt(this.tempElementHeader.size);
                    if (timeCode !== null) {
                        this.timeCode = timeCode;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0xa0: {
                    // Block Group
                    if (!this.currentBlockGroup)
                        this.currentBlockGroup = new BlockGroup(this.tempElementHeader.getData(), this.dataInterface);
                    this.currentBlockGroup.load();
                    if (!this.currentBlockGroup.loaded) return false;
                    this.blockGroups.push(this.currentTag);
                    this.currentBlockGroup = null;
                    break;
                }
                case 0xab: {
                    // PrevSize
                    const prevSize = this.dataInterface.readUnsignedInt(this.tempElementHeader.size);
                    if (prevSize !== null) this.prevSize = prevSize;
                    else return false;
                    break;
                }
                case 0xbf: {
                    // CRC-32
                    const crc = this.dataInterface.getBinary(this.tempElementHeader.size);
                    if (crc !== null) crc;
                    else return false;
                    break;
                    // TODO, ADD VOID
                }
                default:
                    console.warn(
                        `cluster data element not found, skipping : ${this.tempElementHeader.id.toString(16)}`
                    );
                    // This means we probably are out of the cluster now, double check bounds when end not available
                    break;
            }
            this.tempEntry = null;
            this.tempElementHeader.reset();
            //return 1;
        }
        this.loaded = true;
        return true;
    }
}
