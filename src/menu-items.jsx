const menuItems = {
  items: [
    {
      id: 'navigation',
      title: 'Legal Application System',
      type: 'group',
      icon: 'icon-navigation',
      children: [
        // {
        //   id: 'contract-management',
        //   title: 'Contract Management OLD',
        //   type: 'item',
        //   url: '/contract-management'
        // },
        {
          id: 'contract-review',
          title: 'Contract Management',
          type: 'item',
          url: '/contract-review'
        },
        {
          id: 'corporate-governance',
          title: 'Corporate Governance & Legal Advisory',
          type: 'item',
          url: '#'
        },
        {
          id: 'procurement-vendor-support',
          title: 'Procurement & Vendor Contract Support',
          type: 'item',
          url: '#'
        },
        {
          id: 'regulatory-compliance',
          title: 'Regulatory Compliance',
          type: 'item',
          url: '#'
        },
        {
          id: 'litigation-dispute-support',
          title: 'Litigation & Dispute Support',
          type: 'item',
          url: '#'
        },
        {
          id: 'logout',
          title: 'Logout',
          type: 'item',
          url: '/logout'
        }        
      ]
    }
  ]
};

export default menuItems;
