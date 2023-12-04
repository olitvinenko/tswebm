import { DataInterface } from './DataInterface/DataInterface';
import { ElementHeader, ElementHeaderData } from './ElementHeader';

export class CueTrackPositions {
    public readonly dataInterface: DataInterface;
    public offset;
    public size;
    public end;
    public loaded = false;
    public tempElement = null;
    public currentElement: ElementHeader | null = null;
    public cueTrack: number | null = null;
    public cueClusterPosition = 0;
    public cueRelativePosition = 0;

    public constructor(cuesPointHeader: ElementHeaderData, dataInterface: DataInterface) {
        this.dataInterface = dataInterface;
        this.offset = cuesPointHeader.offset;
        this.size = cuesPointHeader.size;
        this.end = cuesPointHeader.end;
    }

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                case 0xf7: {
                    // CueTrack
                    const cueTrack = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (cueTrack !== null) this.cueTrack = cueTrack;
                    else return false;
                    break;
                }
                case 0xf1: {
                    // Cue ClusterPosition
                    const cueClusterPosition = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (cueClusterPosition !== null) this.cueClusterPosition = cueClusterPosition;
                    else return false;
                    break;
                }
                case 0xf0: {
                    // CueRelativePosition
                    const cueRelativePosition = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (cueRelativePosition !== null) this.cueRelativePosition = cueRelativePosition;
                    else return false;
                    break;
                }
                default:
                    console.warn(`Cue track positions not found! ${this.currentElement.id}`);
                    break;
            }
            this.currentElement = null;
        }
        if (this.dataInterface.offset !== this.end) {
            throw new Error('Invalid Seek Formatting');
        }
        this.loaded = true;
        return true;
    }
}
