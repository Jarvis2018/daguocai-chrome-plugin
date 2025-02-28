<template>
    <div class="h-screen w-full flex bg-gray-100">
        <!-- 左侧菜单 -->
        <div class="relative transition-all duration-300 ease-in-out"
            :class="{ 'w-[250px]': !isCollapsed, 'w-0': isCollapsed }">
            <div class="fixed h-screen bg-white shadow-lg transition-all duration-300 ease-in-out"
                :class="{ 'w-[250px]': !isCollapsed, 'w-0': isCollapsed }">
                <!-- 头部 -->
                <div class="h-10 px-4 border-b border-gray-100 flex items-center justify-between" v-if="!isCollapsed">
                    <div class="flex items-center gap-2">
                        <Button type="text" size="small" @click="handleAddRoot"
                            class="flex items-center justify-center p-0 w-7 h-7 hover:bg-gray-100 rounded-lg"
                            title="添加">
                            <PlusOutlined class="text-blue-500 text-lg hover:text-blue-600 transition-colors" />
                        </Button>
                        <Button type="text" size="small" @click="handleExport"
                            class="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded-lg" title="导出数据">
                            <ExportOutlined class="text-green-500 text-lg hover:text-green-600 transition-colors" />
                        </Button>
                        <Button type="text" size="small" @click="handleImport"
                            class="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded-lg" title="导入数据">
                            <ImportOutlined class="text-orange-500 text-lg hover:text-orange-600 transition-colors" />
                        </Button>
                    </div>
                    <Button type="text" size="small" @click="toggleCollapse"
                        class="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded-lg" title="收起菜单">
                        <MenuFoldOutlined class="text-gray-600" />
                    </Button>
                </div>
                <!-- 树形菜单 -->
                <div class="overflow-y-auto h-[calc(100vh-3rem)]" :class="{ 'overflow-hidden': isCollapsed }">
                    <Tree :treeData="treeData" :fieldNames="{ title: 'name', key: 'id' }" @select="handleSelect"
                        draggable :allowDrop="allowDrop" @drop="onDrop" class="py-2 w-full">
                        <template #title="{ name, type, id }">
                            <span class="flex items-center gap-2 group relative min-w-0 pr-20">
                                <div class="flex items-center gap-2 min-w-0">
                                    <FolderOutlined v-if="type === 'folder'" class="text-blue-500 flex-shrink-0" />
                                    <LinkOutlined v-else class="text-green-500 flex-shrink-0" />
                                    <span :class="{ 'hidden': isCollapsed }" class="text-gray-600 truncate">{{ name
                                        }}</span>
                                </div>
                                <div v-if="!isCollapsed"
                                    class="hidden group-hover:block absolute right-0 top-1/2 -translate-y-1/2">
                                    <Dropdown>
                                        <Button type="text" size="small"
                                            class="flex items-center justify-center w-6 h-6 hover:bg-gray-100 rounded-lg">
                                            <MoreOutlined />
                                        </Button>
                                        <template #overlay>
                                            <Menu>
                                                <Menu.Item key="edit" @click.stop="() => handleEdit(id)">
                                                    <EditOutlined />
                                                    <span class="ml-2">重命名</span>
                                                </Menu.Item>
                                                <Menu.Item key="delete" @click.stop="() => handleDelete(id)">
                                                    <DeleteOutlined />
                                                    <span class="ml-2">删除</span>
                                                </Menu.Item>
                                                <Menu.Item v-if="type === 'folder'" key="add"
                                                    @click.stop="() => handleAdd(id)">
                                                    <PlusOutlined />
                                                    <span class="ml-2">添加</span>
                                                </Menu.Item>
                                            </Menu>
                                        </template>
                                    </Dropdown>
                                </div>
                            </span>
                        </template>
                    </Tree>
                </div>
            </div>
        </div>

        <!-- 展开按钮 -->
        <Button type="text"
            class="fixed left-0 top-3 z-20 bg-white shadow-lg rounded-r-lg border-gray-200 border-y border-r hover:bg-gray-50"
            :class="{ 'hidden': !isCollapsed }" size="small" @click="toggleCollapse">
            <MenuUnfoldOutlined class="text-gray-600" />
        </Button>

        <!-- 主内容区 -->
        <div class="flex-1 bg-white">
            <iframe v-if="selectedUrl" :src="selectedUrl" class="w-full h-full border-0"></iframe>
            <div v-else class="h-full flex justify-center items-center">
                <Empty description="请选择一个链接以查看内容" />
            </div>
        </div>

        <!-- 添加/编辑节点对话框 -->
        <Modal :title="modalTitle" :open="modalVisible" @ok="handleSubmit" @cancel="handleCancel">
            <Form :model="formState" :rules="{
                name: [{ required: true, message: '请输入名称' }],
                url: [{ required: formState.type === 'link', message: '请输入URL' }]
            }" ref="formRef">
                <Form.Item label="名称" name="name">
                    <Input v-model:value="formState.name" placeholder="请输入名称" />
                </Form.Item>
                <Form.Item label="类型" name="type">
                    <Radio.Group v-model:value="formState.type" @change="handleTypeChange">
                        <Radio value="folder">文件夹</Radio>
                        <Radio value="link">链接</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item v-if="formState.type === 'link'" label="URL" name="url">
                    <Input v-model:value="formState.url" placeholder="请输入URL" />
                </Form.Item>
            </Form>
        </Modal>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Tree, Button, Empty, Modal, Form, Input, Radio, message, Dropdown, Menu } from 'ant-design-vue';
import {
    FolderOutlined,
    LinkOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    MoreOutlined,
    ImportOutlined,
    ExportOutlined
} from '@ant-design/icons-vue';

// 本地存储键名
const STORAGE_KEY = 'daguocai-navigation';

// 数据结构
const treeData = ref([]);
const selectedUrl = ref('');

// 添加收缩状态
const isCollapsed = ref(false);

// 加载保存的数据
onMounted(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
        const savedData = result[STORAGE_KEY];
        if (savedData) {
            try {
                treeData.value = JSON.parse(savedData);
            } catch (e) {
                console.error('解析保存的导航数据失败', e);
                initDefaultData();
            }
        } else {
            initDefaultData();
        }
    });
});

// 初始化默认数据
const initDefaultData = () => {
    treeData.value = [
        {
            id: '1',
            name: '常用工具',
            type: 'folder',
            children: [
                {
                    id: '1-1',
                    name: 'Google',
                    type: 'link',
                    url: 'https://www.google.com'
                }
            ]
        }
    ];
    saveData();
};

// 保存数据到本地存储
const saveData = () => {
    chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(treeData.value) });
};

// 处理节点选择
const handleSelect = (selectedKeys, { node }) => {
    if (node.type === 'link') {
        selectedUrl.value = node.url;
    }
};

// 判断是否允许拖拽放置
const allowDrop = ({ dropNode, dropPosition }) => {
    // 如果是放在节点上（成为子节点），只允许放在文件夹中
    if (dropPosition === 0) {
        return dropNode.type === 'folder';
    }
    // 如果是放在节点前后，则始终允许
    return true;
};

// 处理拖拽完成事件
const onDrop = ({ node, dragNode, dropPosition, dropToGap }) => {
    // 获取拖拽节点的原始位置信息
    const dragParentId = findParentId(dragNode.id);
    const dragParent = dragParentId ? findNodeById(dragParentId, treeData.value) : null;

    // 删除原始位置的节点
    deleteNode(dragNode.id);

    // 确定目标位置
    if (dropToGap) {
        // 放在节点前后
        const dropParentId = findParentId(node.id);
        const dropParent = dropParentId ? findNodeById(dropParentId, treeData.value) : null;
        const targetList = dropParent ? dropParent.children : treeData.value;
        const targetIndex = targetList.findIndex(item => item.id === node.id);

        // 根据放置位置调整插入位置
        const insertIndex = dropPosition > 0 ? targetIndex + 1 : targetIndex;
        targetList.splice(insertIndex, 0, dragNode);
    } else {
        // 放在节点内部（成为子节点）
        if (!node.children) {
            node.children = [];
        }
        node.children.push(dragNode);
    }

    // 保存更新后的数据
    saveData();
};

// 对话框状态
const modalVisible = ref(false);
const modalTitle = ref('');
const formState = reactive({
    id: '',
    name: '',
    type: 'link',
    url: '',
    parentId: null
});
const formRef = ref();
const isEdit = ref(false);

// 生成唯一ID
const generateId = () => {
    return Date.now().toString();
};

// 打开添加根节点对话框
const handleAddRoot = () => {
    resetForm();
    formState.parentId = null;
    modalTitle.value = '添加根节点';
    modalVisible.value = true;
    isEdit.value = false;
};

// 打开添加子节点对话框
const handleAdd = (nodeId) => {
    const parentNode = findNodeById(nodeId, treeData.value);
    if (!parentNode) return;

    resetForm();
    formState.parentId = parentNode.id;
    modalTitle.value = `添加子节点到 ${parentNode.name}`;
    modalVisible.value = true;
    isEdit.value = false;
};

// 打开编辑节点对话框
const handleEdit = (nodeId) => {
    const node = findNodeById(nodeId, treeData.value);
    if (!node) return;

    resetForm();
    formState.id = node.id;
    formState.name = node.name;
    formState.type = node.type;
    formState.url = node.url || '';
    formState.parentId = findParentId(node.id);

    modalTitle.value = '编辑节点';
    modalVisible.value = true;
    isEdit.value = true;
};

// 处理删除节点
const handleDelete = (nodeId) => {
    const node = findNodeById(nodeId, treeData.value);
    if (!node) return;

    Modal.confirm({
        title: '确认删除',
        content: `确定要删除 ${node.name} ${node.type === 'folder' ? '及其所有子项' : ''}吗？`,
        onOk() {
            deleteNode(node.id);
            message.success('删除成功');
            saveData();

            // 如果删除的是当前显示的链接，清空选中的URL
            if (node.type === 'link' && node.url === selectedUrl.value) {
                selectedUrl.value = '';
            }
        }
    });
};

// 根据ID查找节点
const findNodeById = (id, nodes) => {
    for (const node of nodes) {
        if (node.id === id) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findNodeById(id, node.children);
            if (found) return found;
        }
    }
    return null;
};

// 查找节点的父ID
const findParentId = (nodeId, nodes = treeData.value, parentId = null) => {
    for (const node of nodes) {
        if (node.id === nodeId) {
            return parentId;
        }
        if (node.children && node.children.length > 0) {
            const found = findParentId(nodeId, node.children, node.id);
            if (found !== null) return found;
        }
    }
    return null;
};

// 删除节点
const deleteNode = (nodeId, nodes = treeData.value) => {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === nodeId) {
            nodes.splice(i, 1);
            return true;
        }
        if (nodes[i].children && nodes[i].children.length > 0) {
            if (deleteNode(nodeId, nodes[i].children)) {
                return true;
            }
        }
    }
    return false;
};

// 重置表单
const resetForm = () => {
    formState.id = '';
    formState.name = '';
    formState.type = 'link';
    formState.url = '';
    formState.parentId = null;
};

// 处理表单提交
const handleSubmit = () => {
    formRef.value.validate().then(() => {
        if (isEdit.value) {
            // 编辑现有节点
            const node = findNodeById(formState.id, treeData.value);
            if (node) {
                node.name = formState.name;
                node.type = formState.type;
                if (formState.type === 'link') {
                    node.url = formState.url;
                } else {
                    // 如果类型从链接改为文件夹，删除url属性
                    delete node.url;
                    // 确保有children数组
                    if (!node.children) {
                        node.children = [];
                    }
                }
                message.success('更新成功');
            }
        } else {
            // 创建新节点
            const newNode = {
                id: generateId(),
                name: formState.name,
                type: formState.type
            };

            if (formState.type === 'link') {
                newNode.url = formState.url;
            } else {
                newNode.children = [];
            }

            if (formState.parentId === null) {
                // 添加为根节点
                treeData.value.push(newNode);
            } else {
                // 添加为子节点
                const parentNode = findNodeById(formState.parentId, treeData.value);
                if (parentNode) {
                    if (!parentNode.children) {
                        parentNode.children = [];
                    }
                    parentNode.children.push(newNode);
                }
            }
            message.success('添加成功');
        }

        saveData();
        modalVisible.value = false;
    }).catch(error => {
        console.log('验证失败', error);
    });
};

// 处理表单取消
const handleCancel = () => {
    modalVisible.value = false;
};

// 监听类型变化，如果是文件夹则不需要URL
const handleTypeChange = (e) => {
    formState.type = e.target.value;
};

// 添加收缩切换函数
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
};

// 导出数据
const handleExport = () => {
    try {
        // 将数据转换为JSON字符串
        const jsonData = JSON.stringify(treeData.value, null, 2);

        // 创建Blob对象
        const blob = new Blob([jsonData], { type: 'application/json' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'daguocai-navigation.json';

        // 触发下载
        document.body.appendChild(link);
        link.click();

        // 清理
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        message.success('导出成功');
    } catch (error) {
        console.error('导出失败', error);
        message.error('导出失败');
    }
};

// 导入数据
const handleImport = () => {
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';

    // 监听文件选择事件
    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                // 验证导入的数据格式
                if (Array.isArray(importedData)) {
                    // 更新数据
                    treeData.value = importedData;
                    saveData();
                    message.success('导入成功');

                    // 清空选中的URL
                    selectedUrl.value = '';
                } else {
                    throw new Error('导入的数据格式不正确');
                }
            } catch (error) {
                console.error('导入失败', error);
                message.error('导入失败：数据格式不正确');
            }
        };
        reader.readAsText(file);
    };

    // 触发文件选择
    fileInput.click();
};

</script>

<style>
/* 调整Tree组件样式 */
.ant-tree {
    width: 100%;
    padding: 0 12px;
}

/* 修复父级节点展开三角形按钮与文字的垂直对齐问题 */
.ant-tree .ant-tree-switcher {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 确保树节点内容垂直居中 */
.ant-tree .ant-tree-node-content-wrapper {
    display: flex;
    align-items: center;
}

/* 确保树节点标题占满可用宽度 */
.ant-tree-title {
    width: 100%;
}
</style>