import {execaSync} from "execa"

describe('CLI options', () => {
    it('should return version with -v', () => {
        const res = execaSync('echo', ['unicorns']);
        console.log(res.stdout);
        const result = execaSync('tsx', ['./src/index.ts', "-v"]);
        console.log(result);
        expect(result.stdout).toBeTruthy();
    });
});