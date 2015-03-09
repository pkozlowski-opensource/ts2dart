/// <reference path='../typings/chai/chai.d.ts'/>

import chai = require('chai');
import main = require('../main');
import ts = require('typescript');

describe('transpile to dart', function() {

  function expectTranslate(tsCode: string) {
    var result = translateSource(tsCode);
    return chai.expect(result);
  }

  describe('variables', function() {
    it('should print variable declaration with initializer', function() {
      expectTranslate('var a:number = 1;').to.equal(' num a = 1 ;\n');
    });
    it('should print variable declaration', function () {
      expectTranslate('var a:number;').to.equal(' num a ;\n');
    });
  });

  describe('classes', function() {
    it('should translate classes', function() {
      expectTranslate('class X {}').to.equal(' class X {\n }\n');
    });
    it('should support extends', function() {
      expectTranslate('class X extends Y {}').to.equal(' class X extends Y {\n }\n');
    });
    it('should support implements', function() {
      expectTranslate('class X implements Y, Z {}').to.equal(' class X implements Y , Z {\n }\n');
    });
    it('should support implements', function() {
      expectTranslate('class X extends Y implements Z {}')
          .to.equal(' class X extends Y implements Z {\n }\n');
    });

    describe('members', function() {
      it('supports fields', function() {
        expectTranslate('class X { x: number; }').to.equal(' class X {\n num x ; }\n');
      });
      it('supports field initializers', function() {
        expectTranslate('class X { x: number = 42; }').to.equal(' class X {\n num x = 42 ; }\n');
      });
      it('supports methods', function() {
        expectTranslate('class X { x() { return 42; } }')
            .to.equal(' class X {\n x ( ) { return 42 ; } }\n');
      });
      it('supports method return types', function() {
        expectTranslate('class X { x(): number { return 42; } }')
            .to.equal(' class X {\n num x ( ) { return 42 ; } }\n');
      });
      it('supports method params', function() {
        expectTranslate('class X { x(a, b) { return 42; } }')
            .to.equal(' class X {\n x ( a , b ) { return 42 ; } }\n');
      });
      it('supports method return types', function() {
        expectTranslate('class X { x( a : number, b : string ) { return 42; } }')
            .to.equal(' class X {\n x ( num a , String b ) { return 42 ; } }\n');
      });

      it('supports constructors', function() {
        expectTranslate('class X { constructor() { } }')
            .to.equal(' class X {\n X ( ) { } }\n');
      });
    });
  });

  describe('functions', function() {
    it('supports declarations', function() {
      expectTranslate('function x() {}')
          .to.equal(' x ( ) { }');
    });
    it('supports param default values', function() {
      expectTranslate('function x(a = 42) { return 42; }')
          .to.equal(' x ( [ a = 42 ] ) { return 42 ; }');
    });
    it('does not support var args', function() {
      chai.expect(() => translateSource('function x(...a: number) { return 42; }'))
          .to.throw('rest parameters are unsupported');
    });
  });

  describe('literals', function() {
    it('translates string literals', function() {
      expectTranslate(`'hello\\\\' "world'`).to.equal(` "hello' \\\\"world" ;`);
      expectTranslate(`"hello\\\\" 'world"`).to.equal(` "hello\\\\" 'world" ;`);
    });

    it('translates boolean literals', function() {
      expectTranslate('true').to.equal(' true ;');
      expectTranslate('false').to.equal(' false ;');
    });

    it('translates the null literal', function() {
      expectTranslate('null').to.equal(' null ;');
    });

    it('translates number literals', function() {
      // Negative numbers are handled by unary minus expressions.
      expectTranslate('1234').to.equal(' 1234 ;');
      expectTranslate('12.34').to.equal(' 12.34 ;');
      expectTranslate('1.23e-4').to.equal(' 1.23e-4 ;');
    });

    it('translates regexp literals', function() {
      expectTranslate('/wo\\/t?/').to.equal(' /wo\\/t?/ ;');
    });
  });
});

export function translateSource(contents: string): string {
  var result: string;
  var compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ES6, module: ts.ModuleKind.AMD };
  var compilerHost: ts.CompilerHost = {
    getSourceFile: function (filename, languageVersion) {
      if (filename === 'file.ts')
        return ts.createSourceFile(filename, contents, compilerOptions.target, '0');
      if (filename === 'lib.d.ts')
        return ts.createSourceFile(filename, '', compilerOptions.target, '0');
      return undefined;
    },
    writeFile: function (name, text, writeByteOrderMark) {
      result = text;
    },
    getDefaultLibFilename: function () { return 'lib.d.ts'; },
    useCaseSensitiveFileNames: function () { return false; },
    getCanonicalFileName: function (filename) { return filename; },
    getCurrentDirectory: function () { return ''; },
    getNewLine: function () { return '\n'; }
  };
  // Create a program from inputs
  var program = ts.createProgram(['file.ts'], compilerOptions, compilerHost);
  if (program.getDiagnostics().length > 0) {
    // Throw first error.
    var first = program.getDiagnostics()[0];
    throw new Error(`${first.start}: ${first.messageText} in ${contents}`);
  }
  return main.translateProgram(program);
}