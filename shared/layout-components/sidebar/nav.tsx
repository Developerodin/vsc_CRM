import React from "react";

const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;

const PagesIcon = <i className="bx bx-file-blank side-menu__icon"></i>;

const TaskIcon = <i className="bx bx-task side-menu__icon"></i>;

const AuthenticationIcon = (
  <i className="bx bx-fingerprint side-menu__icon"></i>
);

const ErrorIcon = <i className="bx bx-error side-menu__icon"></i>;

const UiElementsIcon = <i className="bx bx-box side-menu__icon"></i>;

const Utilities = <i className="bx bx-medal side-menu__icon"></i>;

const FormsIcon = <i className="bx bx-file  side-menu__icon"></i>;

const AdvancedUiIcon = <i className="bx bx-party side-menu__icon"></i>;

const WidgetsIcon = <i className="bx bx-gift side-menu__icon"></i>;

const AppsIcon = <i className="bx bx-grid-alt side-menu__icon"></i>;

const NestedmenuIcon = <i className="bx bx-layer side-menu__icon"></i>;

const TablesIcon = <i className="bx bx-table side-menu__icon"></i>;

const ChartsIcon = <i className="bx bx-bar-chart-square side-menu__icon"></i>;

const MapsIcon = <i className="bx bx-map side-menu__icon"></i>;

const GroupsIcon = <i className="bx bx-group side-menu__icon"></i>;

const ActivitiesIcon = <i className="bx bx-store-alt side-menu__icon"></i>;

const ClientsIcon = <i className="bx bx-user side-menu__icon"></i>;

const AnalyticsIcon = <i className="bx bx-network-chart side-menu__icon"></i>;

const BranchesIcon = < i className='bx bx-git-branch side-menu__icon'></i>;

const TeamsIcon = < i className='bx bx-share-alt side-menu__icon'></i>;

const TimeLineIcon = <i className="bx bx-calendar-event side-menu__icon"></i>;

const badge = (
  <span className="badge !bg-warning/10 !text-warning !py-[0.25rem] !px-[0.45rem] !text-[0.75em] ms-1">
    12
  </span>
);
const badge1 = (
  <span className="text-secondary text-[0.75em] rounded-sm !py-[0.25rem] !px-[0.45rem] badge !bg-secondary/10 ms-1">
    New
  </span>
);
const badge2 = (
  <span className="text-danger text-[0.75em] rounded-sm badge !py-[0.25rem] !px-[0.45rem] !bg-danger/10 ms-1">
    Hot
  </span>
);
const badge4 = (
  <span className="text-success text-[0.75em] badge !py-[0.25rem] !px-[0.45rem] rounded-sm bg-success/10 ms-1">
    3
  </span>
);

export const MenuItems: any = [
  {
    menutitle: "GENERAL",
  },

  {
    icon: DashboardIcon,
    title: "Dashboard",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/dashboard",
  },
  
  // {
  //   icon: BranchesIcon,
  //   title: "Branches",
  //   type: "link",
  //   active: false,
  //   selected: false,
  //   dirchange: false,
  //   path: "/branches",
  // },

  // {
  //   icon: ActivitiesIcon,
  //   title: "Activities",
  //   type: "link",
  //   active: false,
  //   selected: false,
  //   dirchange: false,
  //   path: "/activities",
  // },

  {
    icon: ClientsIcon,
    title: "Clients",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/clients",
  },

  {
    icon: GroupsIcon,
    title: "Groups",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/groups",
  },

  {
    icon: TeamsIcon,
    title: "Teams",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/teams",
  },


  {
    icon: TimeLineIcon,
    title: "Timeline",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/timelines",
  },


  {
    icon: AnalyticsIcon,
    title: "Analytics",
    type: "link",
    active: false,
    selected: false,
    dirchange: false,
    path: "/analytics",
  },


  {
    icon: NestedmenuIcon,
    title: "Settings",
    selected: false,
    active: false,
    type: "sub",
    children: [
      {
        title: "Activities",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        path: "/activities",
      },
      {
        title: "Branches",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        path: "/branches",
      },
      {
        title: "Users",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        path: "/users",
      },
      {
        title: "Roles",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        path: "/roles",
      },
    ],
  },
];
