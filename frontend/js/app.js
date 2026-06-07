const API_BASE = (window.API_CONFIG && window.API_CONFIG.baseUrl) || '/api';

class App {
  constructor() {
    this.currentPage = 'devices';
    this.devices = [];
    this.rentalOrders = [];
    this.init();
  }

  init() {
    this.bindNavigation();
    this.navigateTo('devices');
  }

  bindNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.navigateTo(page);
      });
    });
  }

  navigateTo(page) {
    this.currentPage = page;
    this.updateNavActive();
    this.renderPage(page);
  }

  updateNavActive() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
      if (btn.dataset.page === this.currentPage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  renderPage(page) {
    const mainContent = document.getElementById('main-content');
    switch(page) {
      case 'devices':
        this.renderDevicesPage(mainContent);
        break;
      case 'rental-orders':
        this.renderRentalOrdersPage(mainContent);
        break;
      case 'inspections':
        this.renderInspectionsPage(mainContent);
        break;
      case 'damage-claims':
        this.renderDamageClaimsPage(mainContent);
        break;
      case 'contracts':
        this.renderContractsPage(mainContent);
      case 'reshoot-review':
        this.renderReshootReviewPage(mainContent);
        break;
        break;
      default:
        this.renderDevicesPage(mainContent);
    }
  }

  async apiRequest(endpoint, options = {}) {
    try {
      const url = API_BASE + endpoint;
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || '请求失败');
      }
      return data;
    } catch (error) {
      console.error('API请求错误:', error);
      this.showToast(error.message || '网络请求失败', 'error');
      throw error;
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
  }

  showModal(title, content, onConfirm) {
    const container = document.getElementById('modal-container');
    container.innerHTML = '<div class="modal-overlay" id="modal-overlay">' +
    '<div class="modal-content">' +
    '<div class="modal-header">' +
    '<h3 class="text-lg font-semibold text-gray-900">' + title + '</h3>' +
    '<button id="modal-close" class="text-gray-400 hover:text-gray-600">' +
    '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' +
    '</svg></button></div>' +
    '<div class="modal-body">' + content + '</div>' +
    '<div class="modal-footer">' +
    '<button id="modal-cancel" class="btn-secondary">取消</button>' +
    '<button id="modal-confirm" class="btn-primary">确认</button>' +
    '</div></div></div>';
    const closeModal = () => { container.innerHTML = ''; };
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    document.getElementById('modal-confirm').addEventListener('click', async () => {
      if (onConfirm) {
        const result = await onConfirm();
        if (result !== false) closeModal();
      } else { closeModal(); }
    });
  }

  getStatusBadge(status) {
    const statusMap = {
      'active': { class: 'badge-green', text: '正常' },
      'inactive': { class: 'badge-gray', text: '停用' },
      'pending': { class: 'badge-yellow', text: '待处理' },
      'approved': { class: 'badge-green', text: '已通过' },
      'rejected': { class: 'badge-red', text: '已拒绝' },
      'rented': { class: 'badge-blue', text: '已出租' },
      'returned': { class: 'badge-green', text: '已归还' },
      'checked_out': { class: 'badge-blue', text: '已出库' },
      'checked_in': { class: 'badge-green', text: '已归还' },
      'completed': { class: 'badge-green', text: '已完成' },
      'confirmed': { class: 'badge-green', text: '已确认' },
      'archived': { class: 'badge-gray', text: '已归档' },
      'draft': { class: 'badge-gray', text: '草稿' },
      'available': { class: 'badge-green', text: '可用' },
      'out': { class: 'badge-blue', text: '已出库' }
    };
    const config = statusMap[status] || { class: 'badge-gray', text: status };
    return '<span class="badge ' + config.class + '">' + config.text + '</span>';
  }

  async renderDevicesPage(container) {
    container.innerHTML = '<div class="page-header">' +
    '<h2 class="page-title">设备台账</h2>' +
    '<button id="add-device-btn" class="btn-primary">+ 新增设备</button>' +
    '</div>' +
    '<div class="card">' +
    '<div id="devices-table-container" class="table-container">' +
    '<div class="loading"><div class="spinner"></div></div>' +
    '</div></div>';
    document.getElementById('add-device-btn').addEventListener('click', () => {
      this.showDeviceModal();
    });
    await this.loadDevices();
  }

  async loadDevices() {
    try {
      const result = await this.apiRequest('/devices');
      const devices = result.data || result;
      this.devices = devices;
      const tableContainer = document.getElementById('devices-table-container');
      if (!devices || devices.length === 0) {
        tableContainer.innerHTML = '<div class="empty-state"><p>暂无设备数据</p></div>';
        return;
      }
      let html = '<table><thead><tr><th>设备编号</th><th>设备名称</th><th>设备类型</th><th>规格型号</th><th>状态</th><th>操作</th></tr></thead><tbody>';
      devices.forEach(device => {
        html += '<tr>' +
          '<td>' + (device.code || '-') + '</td>' +
          '<td>' + (device.name || '-') + '</td>' +
          '<td>' + (device.type || '-') + '</td>' +
          '<td>' + (device.model || '-') + '</td>' +
          '<td>' + this.getStatusBadge(device.status || 'available') + '</td>' +
          '<td>' +
            '<button class="btn-secondary btn-sm edit-device" data-id="' + device.id + '">编辑</button> ' +
            '<button class="btn-danger btn-sm delete-device" data-id="' + device.id + '">删除</button>' +
          '</td></tr>';
      });
      html += '</tbody></table>';
      tableContainer.innerHTML = html;
      document.querySelectorAll('.edit-device').forEach(btn => {
        btn.addEventListener('click', () => this.editDevice(btn.dataset.id));
      });
      document.querySelectorAll('.delete-device').forEach(btn => {
        btn.addEventListener('click', () => this.deleteDevice(btn.dataset.id));
      });
    } catch (error) {
      console.error('加载设备列表失败:', error);
    }
  }

  showDeviceModal(device = null) {
    const isEdit = !!device;
    const title = isEdit ? '编辑设备' : '新增设备';
    const content = '<div class="form-group">' +
    '<label class="form-label">设备编号 *</label>' +
    '<input type="text" id="device-code" class="form-input" value="' + (device?.code || '') + '" placeholder="请输入设备编号">' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">设备名称 *</label>' +
    '<input type="text" id="device-name" class="form-input" value="' + (device?.name || '') + '" placeholder="请输入设备名称">' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">设备类型 *</label>' +
    '<input type="text" id="device-type" class="form-input" value="' + (device?.type || '') + '" placeholder="请输入设备类型">' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">规格型号</label>' +
    '<input type="text" id="device-model" class="form-input" value="' + (device?.model || '') + '" placeholder="请输入规格型号">' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">设备状态</label>' +
    '<select id="device-status" class="form-select">' +
    '<option value="available"' + (device?.status === 'available' ? ' selected' : '') + '>可用</option>' +
    '<option value="inactive"' + (device?.status === 'inactive' ? ' selected' : '') + '>停用</option>' +
    '</select></div>' +
    '<div class="form-group">' +
    '<label class="form-label">日租金</label>' +
    '<input type="number" id="device-daily-rate" class="form-input" value="' + (device?.daily_rate || 0) + '" placeholder="请输入日租金">' +
    '</div>';
    this.showModal(title, content, async () => {
      const data = {
        code: document.getElementById('device-code').value.trim(),
        name: document.getElementById('device-name').value.trim(),
        type: document.getElementById('device-type').value.trim(),
        model: document.getElementById('device-model').value.trim(),
        status: document.getElementById('device-status').value,
        daily_rate: parseFloat(document.getElementById('device-daily-rate').value) || 0
      };
      if (!data.code || !data.name || !data.type) {
        this.showToast('请填写必填项', 'error');
        return false;
      }
      try {
        if (isEdit) {
          await this.apiRequest('/devices/' + device.id, {
            method: 'PUT',
            body: JSON.stringify(data)
          });
          this.showToast('设备更新成功');
        } else {
          await this.apiRequest('/devices', {
            method: 'POST',
            body: JSON.stringify(data)
          });
          this.showToast('设备新增成功');
        }
        this.loadDevices();
      } catch (error) {
        return false;
      }
    });
  }

  async editDevice(id) {
    try {
      const result = await this.apiRequest('/devices/' + id);
      const device = result.data || result;
      this.showDeviceModal(device);
    } catch (error) {
      console.error('获取设备详情失败:', error);
    }
  }

  async deleteDevice(id) {
    const confirmed = confirm('确定要删除该设备吗？');
    if (!confirmed) return;
    try {
      await this.apiRequest('/devices/' + id, { method: 'DELETE' });
      this.showToast('设备删除成功');
      this.loadDevices();
    } catch (error) {
      console.error('删除设备失败:', error);
    }
  }

  async renderRentalOrdersPage(container) {
    container.innerHTML = '<div class="page-header">' +
    '<h2 class="page-title">租赁管理</h2>' +
    '</div>' +
    '<div class="card">' +
    '<div id="rental-orders-container" class="table-container">' +
    '<div class="loading"><div class="spinner"></div></div>' +
    '</div></div>';
    await this.loadRentalOrders();
  }

  async loadRentalOrders() {
    try {
      const result = await this.apiRequest('/rental-orders');
      const orders = result.data || result;
      this.rentalOrders = orders;
      const container = document.getElementById('rental-orders-container');
      if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无租赁单数据</p></div>';
        return;
      }
      let html = '<table><thead><tr><th>租赁单号</th><th>关联合同</th><th>客户名称</th><th>状态</th><th>操作</th></tr></thead><tbody>';
      orders.forEach(order => {
        let actions = '';
        if (order.status === 'pending') {
          actions += '<button class="btn-primary btn-sm checkout-order" data-id="' + order.id + '">出库确认</button> ';
        }
        if (order.status === 'out') {
          actions += '<button class="btn-success btn-sm return-order" data-id="' + order.id + '">归还确认</button> ';
        }
        html += '<tr>' +
          '<td>' + (order.order_no || '-') + '</td>' +
          '<td>' + (order.contract_id || '-') + '</td>' +
          '<td>' + (order.customer_name || '-') + '</td>' +
          '<td>' + this.getStatusBadge(order.status || 'pending') + '</td>' +
          '<td>' + actions + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
      document.querySelectorAll('.checkout-order').forEach(btn => {
        btn.addEventListener('click', () => this.checkoutOrder(btn.dataset.id));
      });
      document.querySelectorAll('.return-order').forEach(btn => {
        btn.addEventListener('click', () => this.returnOrder(btn.dataset.id));
      });
    } catch (error) {
      console.error('加载租赁单列表失败:', error);
    }
  }

  async checkoutOrder(id) {
    const confirmed = confirm('确定要确认出库吗？');
    if (!confirmed) return;
    try {
      await this.apiRequest('/rental-orders/' + id + '/checkout', { method: 'POST' });
      this.showToast('出库确认成功');
      this.loadRentalOrders();
    } catch (error) {
      console.error('出库确认失败:', error);
    }
  }

  async returnOrder(id) {
    const confirmed = confirm('确定要确认归还吗？');
    if (!confirmed) return;
    try {
      await this.apiRequest('/rental-orders/' + id + '/confirm-return', { method: 'POST' });
      this.showToast('归还确认成功');
      this.loadRentalOrders();
    } catch (error) {
      console.error('归还确认失败:', error);
    }
  }

  async renderInspectionsPage(container) {
    container.innerHTML = '<div class="page-header">' +
    '<h2 class="page-title">巡检管理</h2>' +
    '<button id="add-inspection-btn" class="btn-primary">+ 创建巡检</button>' +
    '</div>' +
    '<div class="card">' +
    '<div id="inspections-container" class="table-container">' +
    '<div class="loading"><div class="spinner"></div></div>' +
    '</div></div>';
    document.getElementById('add-inspection-btn').addEventListener('click', () => {
      this.showInspectionModal();
    });
    await this.loadInspections();
  }

  async loadInspections() {
    try {
      const result = await this.apiRequest('/inspections');
      const inspections = result.data || result;
      const container = document.getElementById('inspections-container');
      if (!inspections || inspections.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无巡检记录</p></div>';
        return;
      }
      let html = '<table><thead><tr><th>设备名称</th><th>巡检人</th><th>巡检时间</th><th>是否损坏</th><th>状态</th><th>操作</th></tr></thead><tbody>';
      inspections.forEach(inspection => {
        const device = this.devices.find(d => d.id === inspection.device_id);
        const hasDamageText = inspection.has_damage === 1 ? '是' : '否';
        const hasDamageClass = inspection.has_damage === 1 ? 'badge-red' : 'badge-green';
        html += '<tr>' +
          '<td>' + (device?.name || inspection.device_id || '-') + '</td>' +
          '<td>' + (inspection.inspector || '-') + '</td>' +
          '<td>' + (inspection.inspect_time || '-') + '</td>' +
          '<td><span class="badge ' + hasDamageClass + '">' + hasDamageText + '</span></td>' +
          '<td>' + this.getStatusBadge(inspection.status || 'draft') + '</td>' +
          '<td><button class="btn-secondary btn-sm upload-photo" data-id="' + inspection.id + '">上传照片</button></td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
      document.querySelectorAll('.upload-photo').forEach(btn => {
        btn.addEventListener('click', () => this.uploadPhoto(btn.dataset.id));
      });
    } catch (error) {
      console.error('加载巡检列表失败:', error);
    }
  }

  async showInspectionModal() {
    try {
      const [devicesResult, ordersResult] = await Promise.all([
        this.apiRequest('/devices'),
        this.apiRequest('/rental-orders')
      ]);
      const devices = devicesResult.data || devicesResult;
      const orders = ordersResult.data || ordersResult;
      
      const deviceOptions = devices.map(d => 
        '<option value="' + d.id + '">' + d.code + ' - ' + d.name + '</option>'
      ).join('');
      
      const orderOptions = orders.map(o => 
        '<option value="' + o.id + '">' + o.order_no + '</option>'
      ).join('');

      const content = '<div class="form-group">' +
      '<label class="form-label">租赁单 *</label>' +
      '<select id="inspection-rental-order" class="form-select">' +
      '<option value="">请选择租赁单</option>' +
      orderOptions +
      '</select></div>' +
      '<div class="form-group">' +
      '<label class="form-label">设备 *</label>' +
      '<select id="inspection-device" class="form-select">' +
      '<option value="">请选择设备</option>' +
      deviceOptions +
      '</select></div>' +
      '<div class="form-group">' +
      '<label class="form-label">巡检时间</label>' +
      '<input type="datetime-local" id="inspection-time" class="form-input">' +
      '</div>' +
      '<div class="form-group">' +
      '<label class="form-label">巡检人</label>' +
      '<input type="text" id="inspection-inspector" class="form-input" placeholder="请输入巡检人">' +
      '</div>' +
      '<div class="form-group">' +
      '<label class="form-label">是否损坏</label>' +
      '<select id="inspection-has-damage" class="form-select">' +
      '<option value="0">否</option>' +
      '<option value="1">是</option>' +
      '</select></div>' +
      '<div class="form-group">' +
      '<label class="form-label">损坏描述</label>' +
      '<textarea id="inspection-damage-desc" class="form-textarea" placeholder="请输入损坏描述"></textarea>' +
      '</div>';

      this.showModal('创建巡检', content, async () => {
        const rental_order_id = document.getElementById('inspection-rental-order').value;
        const device_id = document.getElementById('inspection-device').value;
        const inspect_time = document.getElementById('inspection-time').value;
        const data = {
          rental_order_id: rental_order_id ? parseInt(rental_order_id) : null,
          device_id: device_id ? parseInt(device_id) : null,
          inspector: document.getElementById('inspection-inspector').value.trim(),
          inspect_time: inspect_time ? new Date(inspect_time).toISOString() : null,
          has_damage: parseInt(document.getElementById('inspection-has-damage').value),
          damage_description: document.getElementById('inspection-damage-desc').value.trim(),
          status: 'confirmed'
        };
        if (!data.rental_order_id || !data.device_id) {
          this.showToast('请选择租赁单和设备', 'error');
          return false;
        }
        try {
          await this.apiRequest('/inspections', {
            method: 'POST',
            body: JSON.stringify(data)
          });
          this.showToast('巡检创建成功');
          this.loadInspections();
        } catch (error) {
          return false;
        }
      });
    } catch (error) {
      console.error('加载表单数据失败:', error);
    }
  }

  uploadPhoto(inspectionId) {
    const content = '<div class="form-group">' +
    '<label class="form-label">选择照片</label>' +
    '<input type="file" id="photo-file" class="form-input" accept="image/*" multiple>' +
    '</div>' +
    '<div class="form-group">' +
    '<label class="form-label">照片描述</label>' +
    '<input type="text" id="photo-desc" class="form-input" placeholder="请输入照片描述">' +
    '</div>';
    this.showModal('上传巡检照片', content, async () => {
      const fileInput = document.getElementById('photo-file');
      const files = fileInput.files;
      if (files.length === 0) {
        this.showToast('请选择照片', 'error');
        return false;
      }
      try {
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append('photos', files[i]);
        }
        formData.append('description', document.getElementById('photo-desc').value.trim());
        formData.append('inspection_id', inspectionId);
        const response = await fetch(API_BASE + '/inspections/' + inspectionId + '/photos', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || data.message || '上传失败');
        }
        this.showToast('照片上传成功');
        this.loadInspections();
      } catch (error) {
        this.showToast(error.message || '上传失败', 'error');
        return false;
      }
    });
  }

  async renderDamageClaimsPage(container) {
    container.innerHTML = '<div class="page-header">' +
    '<h2 class="page-title">赔扣管理</h2>' +
    '</div>' +
    '<div class="card">' +
    '<div id="damage-claims-container" class="table-container">' +
    '<div class="loading"><div class="spinner"></div></div>' +
    '</div></div>';
    await this.loadDamageClaims();
  }

  async loadDamageClaims() {
    try {
      const result = await this.apiRequest('/damage-claims');
      const claims = result.data || result;
      const container = document.getElementById('damage-claims-container');
      if (!claims || claims.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无赔扣单数据</p></div>';
        return;
      }
      let html = '<table><thead><tr><th>赔扣单号</th><th>关联租赁单</th><th>赔扣金额</th><th>赔扣原因</th><th>状态</th><th>操作</th></tr></thead><tbody>';
      claims.forEach(claim => {
        let actions = '';
        if (claim.status === 'pending') {
          actions = '<button class="btn-success btn-sm confirm-claim" data-id="' + claim.id + '">财务确认</button>';
        }
        html += '<tr>' +
          '<td>' + (claim.claim_no || '-') + '</td>' +
          '<td>' + (claim.rental_order_no || '-') + '</td>' +
          '<td>¥' + (claim.claim_amount || claim.amount || 0) + '</td>' +
          '<td>' + (claim.claim_reason || claim.reason || '-') + '</td>' +
          '<td>' + this.getStatusBadge(claim.status || 'pending') + '</td>' +
          '<td>' + actions + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
      document.querySelectorAll('.confirm-claim').forEach(btn => {
        btn.addEventListener('click', () => this.confirmClaim(btn.dataset.id));
      });
    } catch (error) {
      console.error('加载赔扣单列表失败:', error);
    }
  }

  async confirmClaim(id) {
    const confirmed = confirm('确定要财务确认该赔扣单吗？');
    if (!confirmed) return;
    try {
      await this.apiRequest('/damage-claims/' + id, {
        method: 'PUT',
        body: JSON.stringify({ status: 'confirmed' })
      });
      this.showToast('赔扣单确认成功');
      this.loadDamageClaims();
    } catch (error) {
      console.error('确认赔扣单失败:', error);
    }
  }

  async renderContractsPage(container) {
    container.innerHTML = '<div class="page-header">' +
    '<h2 class="page-title">合同管理</h2>' +
    '</div>' +
    '<div class="card">' +
    '<div id="contracts-container" class="table-container">' +
    '<div class="loading"><div class="spinner"></div></div>' +
    '</div></div>';
    await this.loadContracts();
  }

  async loadContracts() {
    try {
      const result = await this.apiRequest('/contracts');
      const contracts = result.data || result;
      const container = document.getElementById('contracts-container');
      if (!contracts || contracts.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无合同数据</p></div>';
        return;
      }
      let html = '<table><thead><tr><th>合同编号</th><th>客户名称</th><th>项目名称</th><th>开始日期</th><th>结束日期</th><th>状态</th><th>操作</th></tr></thead><tbody>';
      contracts.forEach(contract => {
        let actions = '';
        if (contract.status !== 'archived') {
          actions = '<button class="btn-secondary btn-sm archive-contract" data-id="' + contract.id + '">归档</button>';
        }
        html += '<tr>' +
          '<td>' + (contract.contract_no || '-') + '</td>' +
          '<td>' + (contract.customer_name || '-') + '</td>' +
          '<td>' + (contract.project_name || '-') + '</td>' +
          '<td>' + (contract.start_date || '-') + '</td>' +
          '<td>' + (contract.end_date || '-') + '</td>' +
          '<td>' + this.getStatusBadge(contract.status || 'draft') + '</td>' +
          '<td>' + actions + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
      document.querySelectorAll('.archive-contract').forEach(btn => {
        btn.addEventListener('click', () => this.archiveContract(btn.dataset.id));
      });
    } catch (error) {
      console.error('加载合同列表失败:', error);
    }
  }

  async archiveContract(id) {
    const confirmed = confirm('确定要归档该合同吗？归档后将无法修改。');
    if (!confirmed) return;
    try {
      await this.apiRequest('/contracts/' + id + '/archive', { method: 'POST' });
      this.showToast('合同归档成功');
      this.loadContracts();
    } catch (error) {
      console.error('归档合同失败:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
