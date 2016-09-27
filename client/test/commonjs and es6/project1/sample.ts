import { Test } from "./subfolder/test";
import { ClassOne } from "./index";
import { TypeOne } from "./index";
import { ClassFromAnotherProject } from "./../project2/index";

export class Sample {
    
    constructor() {
        const test: TypeOne = "hi";
        const hello: ClassOne  = null;
    }
    
}