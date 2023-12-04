import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader, ElementHeaderData } from './ElementHeader';

export class Targets {
    public readonly dataInterface: DataInterface;
    public offset;
    public size;
    public end;
    public loaded: boolean = false;
    public tempElement: any = null;
    public currentElement: ElementHeader | null = null;
    public cueTrack = null;
    public cueClusterPosition = 0;
    public cueRelativePosition = 0;
    public targetTypeValue: number = 0;
    public tagTrackUID: number = 0;

    public constructor(targetsHeader: ElementHeaderData, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = targetsHeader.offset;
        this.size = targetsHeader.size;
        this.end = targetsHeader.end;
    }

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0x63c5: {
                    // tagTrackUID
                    const tagTrackUID = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (tagTrackUID !== null) this.tagTrackUID = tagTrackUID;
                    else return false;
                    break;
                }
                case 0x68ca: {
                    // TargetTypeValue
                    const targetTypeValue = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (targetTypeValue !== null) this.targetTypeValue = targetTypeValue;
                    else return false;
                    break;
                }
                default:
                    if (!this.dataInterface.peekBytes(this.currentElement.size)) {
                        return false;
                    } else {
                        this.dataInterface.skipBytes(this.currentElement.size);
                    }
                    console.warn(`targets element not found ! : ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }

        if (this.dataInterface.offset !== this.end) console.error('Invalid Targets Formatting');
        this.loaded = true;
        return true;
    }
}
