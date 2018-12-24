import config from 'app/core/config';
import $ from 'jquery';
import _ from 'lodash';

export class LocalAppCtrl {
  viewId: string;
  sections: any[];

  constructor(private $scope, private $location, private $rootScope) {
    this.buildSectionList();
    this.onRouteUpdated();
    this.$rootScope.onAppEvent('$routeUpdate', this.onRouteUpdated.bind(this), this.$scope);
  }

  buildSectionList() {
    this.sections = [];
    this.sections.push({
      title: 'College Settings',
      id: 'college_settings',
      description: 'General Info, Legal entities, Locations, College branches, Department settings',
    });
    this.sections.push({
      title: 'Payroll',
      id: 'payroll',
      description: 'Setup, Leave encashment, Payment and Payslip settings',
    });
    this.sections.push({
      title: 'Leave & Holidays',
      id: 'leave_holidays',
      description: 'Leave plans, Initial adjustments, Notify and Holidays',
    });
    this.sections.push({
      title: 'Employee',
      id: 'employee',
      description: 'Job titles, Probation/Notice Period, Employee number settings',
    });
    this.sections.push({
      title: 'Time & Attendance',
      id: 'time_attendance',
      description: 'Weekly offs, Shifts, Display settings, IP Networks',
    });
    this.sections.push({
      title: 'Roles & Permissions',
      id: 'roles_permissions',
      description: 'Manage roles and permissions',
    });
    this.sections.push({
      title: 'Integrations',
      id: 'integrations',
      description: 'Login integration',
    });

    const params = this.$location.search();
    const url = this.$location.path();

    for (const section of this.sections) {
      const sectionParams = _.defaults({ activeView: section.id }, params);
      section.url = config.appSubUrl + url + '?' + $.param(sectionParams);
    }
  }

  onRouteUpdated() {
    this.viewId = this.$location.search().activeView;
    if (!this.viewId) {
      this.viewId = 'college_settings';
    }
  }
}
