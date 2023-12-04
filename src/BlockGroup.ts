import { DataInterface } from './DataInterface/DataInterface';

export class BlockGroup {
    public readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public loaded: boolean = false;
    public currentElement: any = null;

    public blockDuration: number = -1;
    public referenceBlock: number = -1;
    public discardPadding: number = -1;

    public constructor(blockGroupHeader: any, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = blockGroupHeader.offset;
        this.size = blockGroupHeader.size;
        this.end = blockGroupHeader.end;
        this.currentElement = null;
    }

    public load(): boolean {
        const end = this.end;
        while (this.dataInterface.offset < end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0xa1: {
                    //Block
                    const block = this.dataInterface.getBinary(this.currentElement.size);
                    if (block !== null) block;
                    //this.docTypeReadVersion = docTypeReadVersion;
                    else return false;
                    break;
                }
                case 0x9b: {
                    //BlockDuration
                    const blockDuration = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (blockDuration !== null) this.blockDuration = blockDuration;
                    else return false;
                    break;
                }
                case 0xfb: {
                    //ReferenceBlock
                    const referenceBlock = this.dataInterface.readSignedInt(this.currentElement.size);
                    if (referenceBlock !== null) this.referenceBlock = referenceBlock;
                    else return false;
                    break;
                }
                case 0x75a2: {
                    //DiscardPadding
                    const discardPadding = this.dataInterface.readSignedInt(this.currentElement.size);
                    if (discardPadding !== null) this.discardPadding = discardPadding;
                    else return false;
                    break;
                }
                default:
                    console.warn(`block group element not found, skipping ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }
        this.loaded = true;
        return true;
    }
}
