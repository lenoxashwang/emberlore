import { defineInterface } from '@directus/extensions-sdk';
import { computed, h, inject, ref, resolveComponent, watch } from 'vue';

function buildSourceKey(locale, baseSourceKey) {
  const safeLocale = String(locale || '').trim();
  const safeBaseSourceKey = String(baseSourceKey || '').trim();

  if (!safeLocale || !safeBaseSourceKey) {
    return null;
  }

  const separatorIndex = safeBaseSourceKey.indexOf(':');
  const suffix = separatorIndex >= 0
    ? safeBaseSourceKey.slice(separatorIndex + 1)
    : safeBaseSourceKey;

  return suffix ? `${safeLocale}:${suffix}` : null;
}

const EmberloreTranslationLocaleSelect = {
  props: {
    value: {
      type: String,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    choices: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['input', 'setFieldValue'],
  setup(props, { emit }) {
    const values = inject('values', ref({}));
    const items = computed(() => Array.isArray(props.choices) ? props.choices : []);
    const locale = computed(() => props.value ?? values.value?.locale ?? null);
    const baseSourceKey = computed(() => values.value?.base_source_key ?? null);

    watch(
      [locale, baseSourceKey],
      ([nextLocale, nextBaseSourceKey]) => {
        emit('setFieldValue', {
          field: 'source_key',
          value: buildSourceKey(nextLocale, nextBaseSourceKey),
        });
      },
      { immediate: true },
    );

    function updateValue(nextValue) {
      emit('input', nextValue || null);
    }

    return {
      items,
      updateValue,
    };
  },
  render() {
    const VSelect = resolveComponent('v-select');

    return h(VSelect, {
      modelValue: this.value,
      items: this.items,
      disabled: this.disabled,
      placeholder: 'Select a language...',
      allowOther: false,
      showDeselect: false,
      'onUpdate:modelValue': this.updateValue,
    });
  },
};

export default defineInterface({
  id: 'emberlore-translation-locale-select',
  name: 'Translation Locale Select',
  description: 'Locale dropdown that keeps source_key synced with base_source_key.',
  icon: 'translate',
  component: EmberloreTranslationLocaleSelect,
  types: ['string'],
  options: [],
});
