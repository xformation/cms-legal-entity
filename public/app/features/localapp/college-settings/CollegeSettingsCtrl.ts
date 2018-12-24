export class CollegeSettingsCtrl {
  sections: any[];
  activeTabId: string;
  constructor() {
    this.activeTabId = 'legal_entities';
    this.buildSectionList();
  }

  buildSectionList() {
    this.sections = [];
    this.sections.push({
      title: 'GENERAL INFO',
      id: 'general_info',
    });
    this.sections.push({
      title: 'LEGAL ENTITIES',
      id: 'legal_entities',
    });
    this.sections.push({
      title: 'LOCATIONS',
      id: 'locations',
    });
    this.sections.push({
      title: 'COLLEGE BRANCHES',
      id: 'college_branches',
    });
    this.sections.push({
      title: 'DEPARTMENT SETTINGS',
      id: 'department_settings',
    });
  }

  setActiveTab(id) {
    this.activeTabId = id;
  }
}
