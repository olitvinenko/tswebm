import { DataInterface } from './DataInterface/DataInterface';
import { Track } from './Track';

export class VideoTrack extends Track {
    public readonly dataInterface: DataInterface;
    public offset: number;
    public size: number;
    public end: number;
    public loaded: boolean = false;
    public width: number = 0;
    public height: number = 0;
    public displayWidth: number = 0;
    public displayHeight: number = 0;
    public displayUnit = 0;
    public stereoMode: number = 0;
    public frameRate: number = 0;
    public pixelCropBottom: number = 0;
    public pixelCropTop: number = 0;
    public pixelCropLeft: number = 0;
    public pixelCropRight: number = 0;
    public currentElement: any;
    public flagInterlaced: any;

    public constructor(trackHeader: any, dataInterface: DataInterface) {
        super();
        this.dataInterface = dataInterface;
        this.offset = trackHeader.offset;
        this.size = trackHeader.size;
        this.end = trackHeader.end;
    }

    public load(): boolean {
        while (this.dataInterface.offset < this.end) {
            if (!this.currentElement) {
                this.currentElement = this.dataInterface.peekElement();
                if (this.currentElement === null) return false;
            }
            switch (this.currentElement.id) {
                // TODO add color
                case 0xb0: {
                    // Pixel width
                    const width = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (width !== null) {
                        this.width = width;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0xba: {
                    // Pixel Height
                    const height = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (height !== null) {
                        this.height = height;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x54b0: {
                    // Display width
                    const displayWidth = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (displayWidth !== null) {
                        this.displayWidth = displayWidth;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x54ba: {
                    // Display height
                    const displayHeight = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (displayHeight !== null) {
                        this.displayHeight = displayHeight;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x54b2: {
                    // Display unit
                    const displayUnit = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (displayUnit !== null) {
                        this.displayUnit = displayUnit;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x53b8: {
                    // Stereo mode
                    const stereoMode = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (stereoMode !== null) {
                        this.stereoMode = stereoMode;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x2383e3: {
                    // FRAME RATE - NEEDS TO BE FLOAT
                    const frameRate = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (frameRate !== null) {
                        this.frameRate = frameRate;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x9a: {
                    // FlagInterlaced
                    const flagInterlaced = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    if (flagInterlaced !== null) {
                        this.flagInterlaced = flagInterlaced;
                    } else {
                        return false;
                    }
                    break;
                }
                case 0x55b0: {
                    // Color
                    const colors = this.dataInterface.readUnsignedInt(this.currentElement.size);
                    colors;
                    break;
                }
                default:
                    console.warn(`Info element not found, skipping: ${this.currentElement.id.toString(16)}`);
                    break;
            }
            this.currentElement = null;
        }

        if (!this.displayWidth) {
            this.displayWidth = this.width - this.pixelCropLeft; // - Math.PI;
        }

        if (!this.displayHeight) {
            this.displayHeight = this.height - this.pixelCropTop; // - Math.PI;
        }
        this.loaded = true;
        return true;
    }
}
