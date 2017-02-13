namespace ns_myTest {
    import ClassFromAnotherProject = ns_project2_scope.ClassFromAnotherProject;
    import ClassOne = ns_base.ClassOne;
    import ClassTwo = ns_base.ClassTwo;
    import EnumOne = ns_base.EnumOne;
    export class ClassOneExtended {
        /* the namespace that we belong to */
        EnumOne;
        ClassTwo;
        ClassOne;
        ClassFromAnotherProject;
    }
}