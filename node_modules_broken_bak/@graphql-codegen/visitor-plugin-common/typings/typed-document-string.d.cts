export declare const typedDocumentString: {
    /**
     * This is a utility template required by plugins that use `documentMode=string`
     * The class acts as a wrapper of string, and allows typing the string with
     * GraphQL `Result` and `Variables` types.
     */
    template: string;
    /**
     * `TypedDocumentString` class above needs `DocumentTypeDecoration` from `@graphql-typed-document-node/core`
     * This `imports` object helps when generating the import statement.
     *
     * This intentionally follows [ClientSideBaseVisitor#_generateImport()]({@link https://github.com/dotansimha/graphql-code-generator/blob/master/packages/plugins/other/visitor-plugin-common/src/client-side-base-visitor.ts})
     * to make it easier to use.
     */
    import: {
        moduleName: string;
        propName: string;
    };
};
