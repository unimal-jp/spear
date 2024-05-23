import {execaSync} from "execa"

describe('CLI options', () => {
    it('should return version with -v', () => {
        const result = execaSync('tsx', ['./src/index.ts', "-v"]);
        expect(result.stdout).toBeTruthy();
    });
});