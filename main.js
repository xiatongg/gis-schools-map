// 加载JSON数据
let schools = [];
let map;
let currentInfoPanel = null;

// 从JSON文件加载数据
async function loadData() {
    try {
        console.log('开始加载数据...');
        const response = await fetch('output/gis_schools.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('原始数据:', data);
        
        if (!Array.isArray(data)) {
            throw new Error('数据格式错误：不是数组');
        }
        
        schools = data;
        console.log('数据加载成功，学校数量:', schools.length);
        
        // 验证数据格式
        if (schools.length > 0) {
            const firstSchool = schools[0];
            if (!firstSchool.location || 
                typeof firstSchool.location.longitude === 'undefined' || 
                typeof firstSchool.location.latitude === 'undefined') {
                throw new Error('数据格式错误：缺少位置信息');
            }
        }
        
        // 初始化地图
        initializeMap();
        // 创建学校列表
        createSchoolList();
        // 添加搜索功能
        addSearchFunction();
        
        console.log('初始化完成');
    } catch (error) {
        console.error('加载数据失败：', error);
        // 在页面上显示错误信息
        const mapDiv = document.getElementById('map');
        mapDiv.innerHTML = `
            <div style="padding: 20px; color: red; text-align: center;">
                <h3>数据加载失败</h3>
                <p>${error.message}</p>
                <p>请确保您正在使用Web服务器运行此页面（而不是直接打开HTML文件）</p>
            </div>
        `;
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化...');
    loadData();
});

// 显示学校信息
function showSchoolInfo(school) {
    const infoPanel = document.getElementById('schoolInfo');
    infoPanel.innerHTML = `
        <div style="padding: 20px; font-size: 14px;">
            <h3 style="margin: 0; color: #2c3e50;">${school.name}</h3>
            <p style="margin: 10px 0; color: #666;">${school.province}，招生人数：${school.total_students}人</p>
            <div style="border-top: 1px solid #eee; padding-top: 10px;">
                <h4 style="margin: 0 0 8px 0; color: #2c3e50;">招生专业信息：</h4>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f8f9fa;">
                            <th style="border: 1px solid #e9ecef; padding: 8px; text-align: left; color: #495057;">院系</th>
                            <th style="border: 1px solid #e9ecef; padding: 8px; text-align: left; color: #495057;">专业</th>
                            <th style="border: 1px solid #e9ecef; padding: 8px; text-align: left; color: #495057;">研究方向</th>
                            <th style="border: 1px solid #e9ecef; padding: 8px; text-align: left; color: #495057;">招生人数</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${school.departments.map(dept => `
                            <tr>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.department}</td>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.specialty}</td>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.field}</td>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.number}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <h4 style="margin: 16px 0 8px 0; color: #2c3e50;">考试科目：</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tbody>
                        ${school.departments.map(dept => `
                            <tr>
                                <td colspan="4" style="border: 1px solid #e9ecef; padding: 8px; background-color: #f8f9fa; color: #495057;">
                                    <strong>${dept.department} - ${dept.field}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.subjects.subject1}</td>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.subjects.subject2}</td>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.subjects.subject3}</td>
                                <td style="border: 1px solid #e9ecef; padding: 8px; color: #495057;">${dept.subjects.subject4}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    infoPanel.style.display = 'block';
    currentInfoPanel = infoPanel;
}

// 初始化地图
function initializeMap() {
    map = new AMap.Map('map', {
        zoom: 5.5,
        center: [104.1954, 35.8616]
    });

    // 创建卫星图层
    const satellite = new AMap.TileLayer.Satellite();
    
    // 创建热力图层
    const heatmap = new AMap.HeatMap(map, {
        radius: 25,  // 热力图的半径大小
        opacity: [0, 0.8],  // 热力图的透明度范围
        gradient: {  // 热力图的渐变色
            '0.4': 'rgb(0, 0, 255)',
            '0.6': 'rgb(0, 255, 0)',
            '0.8': 'rgb(255, 255, 0)',
            '1.0': 'rgb(255, 0, 0)'
        },
        zooms: [1, 20]  // 支持的缩放级别范围
    });

    // 准备热力图数据
    const heatmapData = schools.map(school => {
        const lng = parseFloat(school.location.longitude);
        const lat = parseFloat(school.location.latitude);
        const count = parseInt(school.total_students || 0);
        
        if (!isNaN(lng) && !isNaN(lat) && !isNaN(count)) {
            return {
                lng: lng,
                lat: lat,
                count: count
            };
        }
        return null;
    }).filter(data => data !== null);

    console.log('热力图数据点数:', heatmapData.length);

    if (heatmapData.length > 0) {
        const maxCount = Math.max(...heatmapData.map(d => d.count));
        console.log('最大招生人数:', maxCount);
        
        heatmap.setDataSet({
            data: heatmapData,
            max: maxCount
        });
    }
    heatmap.hide();  // 默认隐藏热力图

    // 添加图层切换控件
    const layerCtrl = new AMap.Control({
        position: 'LB',
        offset: new AMap.Pixel(10, 80)
    });

    // 自定义图层控件的内容
    const layerContent = document.createElement('div');
    layerContent.className = 'layer-control';
    layerContent.innerHTML = `
        <div class="layer-title">图层选择</div>
        <div class="layer-item">
            <input type="radio" name="layer" id="normal" checked>
            <label for="normal">标准地图</label>
        </div>
        <div class="layer-item">
            <input type="radio" name="layer" id="satellite">
            <label for="satellite">卫星地图</label>
        </div>
        <div class="layer-item">
            <input type="checkbox" id="heatmap">
            <label for="heatmap">招生热力图</label>
        </div>
    `;

    // 添加图层切换事件
    const normalRadio = layerContent.querySelector('#normal');
    const satelliteRadio = layerContent.querySelector('#satellite');
    const heatmapCheckbox = layerContent.querySelector('#heatmap');

    normalRadio.addEventListener('change', () => {
        if (normalRadio.checked) {
            satellite.hide();
            map.setLayers([new AMap.TileLayer()]);
        }
    });

    satelliteRadio.addEventListener('change', () => {
        if (satelliteRadio.checked) {
            map.setLayers([satellite]);
            satellite.show();
        }
    });

    heatmapCheckbox.addEventListener('change', () => {
        if (heatmapCheckbox.checked) {
            heatmap.show();
        } else {
            heatmap.hide();
        }
    });

    layerCtrl.element = layerContent;
    map.addControl(layerCtrl);

    // 添加缩放控件
    const toolBar = new AMap.ToolBar({
        position: 'RB',  // 右下角
        offset: new AMap.Pixel(-10, 10),  // 偏移量
        ruler: false,    // 不显示标尺
        direction: false, // 不显示指南针
        locate: false,   // 不显示定位按钮
        autoPosition: false  // 禁用自动定位
    });
    map.addControl(toolBar);

    // 添加右键菜单
    let contextMenu = new AMap.ContextMenu();
    contextMenu.addItem("缩放至全国范围", function() {
        map.setZoomAndCenter(5, [104.1954, 35.8616]);
    }, 0);

    map.on('rightclick', function(e) {
        contextMenu.open(map, e.lnglat);
    });

    // 添加地图点击事件监听
    map.on('click', function(e) {
        // 检查点击的目标是否是标记或控件
        if (e.target && (e.target instanceof AMap.Marker || 
            e.target.className && (
                e.target.className.includes('amap-scale') || 
                e.target.className.includes('amap-toolbar')
            ))) {
            return;  // 如果是标记或控件，不做任何处理
        }
        
        // 如果不是标记或控件，关闭信息面板
        const infoPanel = document.getElementById('schoolInfo');
        if (infoPanel.style.display === 'block') {
            infoPanel.style.display = 'none';
        }
    });

    // 阻止信息面板内的点击事件冒泡
    document.getElementById('schoolInfo').addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // 创建标记
    schools.forEach(school => {
        try {
            let marker = new AMap.Marker({
                position: [school.location.longitude, school.location.latitude],
                title: school.name,
                cursor: 'pointer',
                clickable: true,
                extData: school  // 将学校数据存储在标记中
            });
            
            marker.setMap(map);
            
            // 使用高德地图的事件绑定方式
            marker.on('click', function(e) {
                const school = marker.getExtData();  // 获取存储的学校数据
                showSchoolInfo(school);
                map.setZoomAndCenter(14, [school.location.longitude, school.location.latitude]);
                if (e && e.stop) {
                    e.stop();  // 阻止事件冒泡
                }
            });
            
        } catch (error) {
            console.error(`Error creating marker for ${school.name}:`, error);
        }
    });

    createSchoolList();
    addSearchFunction();
}

// 创建侧边学校列表
function createSchoolList() {
    const schoolList = document.getElementById('schoolList');
    if (!schoolList) {
        console.error('找不到schoolList元素');
        return;
    }

    // 清空现有内容
    schoolList.innerHTML = '';
    
    // 按省份分组学校
    const schoolsByProvince = schools.reduce((acc, school) => {
        if (!school.province) return acc;  // 跳过没有省份信息的学校
        const province = school.province;
        if (!acc[province]) {
            acc[province] = [];
        }
        acc[province].push(school);
        return acc;
    }, {});

    // 按省份名称排序
    const sortedProvinces = Object.keys(schoolsByProvince).sort();

    // 创建省份分组
    sortedProvinces.forEach(province => {
        try {
            const provinceDiv = document.createElement('div');
            provinceDiv.className = 'province-group';
            
            // 创建省份标题
            const headerDiv = document.createElement('div');
            headerDiv.className = 'province-header';
            headerDiv.innerHTML = `
                <span>${province}</span>
                <span class="arrow">▼</span>
            `;
            
            // 创建学校列表容器
            const schoolsDiv = document.createElement('div');
            schoolsDiv.className = 'province-schools';
            
            // 添加学校列表
            schoolsByProvince[province].forEach(school => {
                if (!school || !school.name) return;  // 跳过无效的学校数据
                
                const schoolDiv = document.createElement('div');
                schoolDiv.className = 'school-item';
                schoolDiv.innerHTML = `
                    <div>${school.name}</div>
                    <small>招生人数：${school.total_students || '未知'}人</small>
                `;
                
                // 点击学校列表项时，缩放地图并显示信息
                schoolDiv.addEventListener('click', (e) => {
                    e.stopPropagation();  // 阻止事件冒泡
                    if (school.location && school.location.longitude && school.location.latitude) {
                        showSchoolInfo(school);
                        map.setZoomAndCenter(14, [school.location.longitude, school.location.latitude]);
                    }
                });
                
                schoolsDiv.appendChild(schoolDiv);
            });
            
            // 添加点击展开/收起功能
            headerDiv.addEventListener('click', () => {
                headerDiv.classList.toggle('active');
                schoolsDiv.classList.toggle('active');
            });
            
            provinceDiv.appendChild(headerDiv);
            provinceDiv.appendChild(schoolsDiv);
            schoolList.appendChild(provinceDiv);
        } catch (error) {
            console.error(`创建省份 ${province} 的列表时出错:`, error);
        }
    });
}

// 搜索功能
function addSearchFunction() {
    const sidebar = document.querySelector('.sidebar');
    const searchDiv = document.createElement('div');
    searchDiv.innerHTML = `
        <div class="search-box">
            <input type="text" id="searchInput" placeholder="搜索院校...">
        </div>
    `;
    sidebar.insertBefore(searchDiv, document.getElementById('schoolList'));

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();
        const provinceGroups = document.querySelectorAll('.province-group');
        
        provinceGroups.forEach(group => {
            const schools = group.querySelectorAll('.school-item');
            let hasVisibleSchools = false;
            
            schools.forEach(school => {
                const schoolName = school.querySelector('div').textContent.toLowerCase();
                if (schoolName.includes(searchText)) {
                    school.style.display = 'block';
                    hasVisibleSchools = true;
                } else {
                    school.style.display = 'none';
                }
            });
            
            group.style.display = hasVisibleSchools ? 'block' : 'none';
            
            if (searchText) {
                const schoolsDiv = group.querySelector('.province-schools');
                const header = group.querySelector('.province-header');
                schoolsDiv.classList.add('active');
                header.classList.add('active');
            }
        });
    });
} 