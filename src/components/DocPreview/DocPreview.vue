<template>
  <div class="document-preview">
    <div v-if="fileType === 'text'" id="text-preview-container">
      <div class="docx-wrapper">
        <div class="text"/>
      </div>
    </div>
    <div id="docx-preview-container"/>
    <div id="xlsx-preview-container"/>
    <el-image
        v-if="fileType === 'image'"
        :src="fileUrl"
        :preview-src-list="[fileUrl]"
    />
    <VuePdfEmbed
        v-if="fileType === 'pdf'"
        :source="{
            url: fileUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.5.207/cmaps/',
            cMapPacked: true
        }"
    />
  </div>
</template>

<script lang="ts" setup>
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/image/style/css'
import {nextTick, onMounted, ref, Ref} from 'vue';
import {renderAsync} from 'docx-preview';
import {ElMessage, ElImage} from 'element-plus';
import {read, utils} from 'xlsx';
import VuePdfEmbed from 'vue-pdf-embed';
import {download, errorMsg} from '../../services/download/download.service';
import qs from 'qs';

const fileType: Ref<string> = ref('');
const fileUrl: Ref<string> = ref('');

const renderText = (file: Blob) => {
  const reader = new FileReader();
  reader.onload = function () {
    if (reader.result) {
      (document.querySelector('#text-preview-container .docx-wrapper .text') as unknown as HTMLElement).innerText = <string>reader.result || '';
    }
  };
  reader.readAsText(file);
};

const renderWord = (file: Blob) => {
  renderAsync(file, document.getElementById('docx-preview-container') as HTMLElement)
      .then();
};

const renderExcel = async (file: Blob) => {
  const f = await file.arrayBuffer();
  const wb = read(f);

  // sheet切换
  function sheetSwitchBtnClick(e: Event) {
    const id = (e.target as HTMLElement).getAttribute('sheet-id');
    document.querySelectorAll('#xlsx-preview-container .sheet-switch-btn').forEach(btn => {
      const btnId = (btn as HTMLElement).getAttribute('sheet-id');
      btn.className = `sheet-switch-btn${btnId === id ? ' active' : ''}`;
    });
    document.querySelectorAll('#xlsx-preview-container .sheet').forEach((sheet, i) => {
      sheet.className = `sheet${String(i) === id ? ' show' : ''}`;
    });
  }

  // 渲染表数据
  function createExcelTable(name: string, i: number) {
    const data = utils.sheet_to_html(wb.Sheets[name]);

    const tableDom = document.createElement('div');
    tableDom.className = 'sheet';
    tableDom.innerHTML = data;
    document.querySelector('#xlsx-preview-container .sheets')?.append(tableDom);

    const switchDom = document.createElement('div');
    switchDom.className = `sheet-switch-btn${i === 0 ? ' active' : ''}`;
    switchDom.setAttribute('sheet-id', String(i));
    switchDom.innerHTML = name;
    switchDom.addEventListener('click', sheetSwitchBtnClick);
    document.querySelector('#xlsx-preview-container .sheet-switch-buttons')?.append(switchDom);
  }

  const switchButtons = document.createElement('div');
  switchButtons.className = 'sheet-switch-buttons';
  document.getElementById('xlsx-preview-container')?.append(switchButtons);
  const sheetsDom = document.createElement('div');
  sheetsDom.className = 'sheets';
  document.getElementById('xlsx-preview-container')?.append(sheetsDom);

  wb.SheetNames.forEach((name, index) => {
    createExcelTable(name, index);
  });
  nextTick(() => {
    const tableDom = document.querySelectorAll('#xlsx-preview-container table');
    tableDom.forEach(dom => {
      dom.setAttribute('border', '0');
      dom.setAttribute('cellspacing', '0');
      dom.setAttribute('cellpadding', '0');
    });
    (document.querySelectorAll('#xlsx-preview-container .sheet-switch-btn')[0] as HTMLElement).click();
  });
};

const showError = (msg: string) => {
  ElMessage({type: 'error', message: msg, duration: 0});
};

const isMobile = ref<boolean>(false);

const getFile = async () => {
  const params = qs.parse(window.location.search.substring(1));
  const url = params.url;
  // isMobile.value = params.type === 'isMobile';
  if (!url) return errorMsg('文件地址不存在')
  const file = await download(<string>url);
  if (url && file) {
    try {
      switch (file.type) {
        case 'text/plain':
          // case 'text/rtf':
          fileType.value = 'text';
          renderText(file);
          break;
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          fileType.value = 'word';
          renderWord(file);
          break;
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          fileType.value = 'excel';
          await renderExcel(file);
          break;
        case 'application/pdf':
          fileUrl.value = url.toString();
          fileType.value = 'pdf';
          break;
        case 'image/jpeg':
        case 'image/png':
        case 'image/svg+xml':
        case 'image/tiff':
        case 'image/webp':
          fileUrl.value = url.toString();
          fileType.value = 'image';
          break;
        default:
          showError('不支持的文件格式，请下载查看');
          break;
      }
    } catch (e) {
      showError('文件可能损坏，渲染失败，请下载查看');
    }
  }
};

onMounted(() => {
  getFile();
});

</script>
<style lang="scss" scoped src="./style.scss"></style>
