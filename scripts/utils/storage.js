/**
 * 本地存储管理类 (StorageManager)
 * 封装 localStorage，提供带过期时间的存储功能及异常处理
 */
export default class StorageManager {
  /**
   * 设置存储
   * @param {string} key - 键名
   * @param {any} value - 值
   * @param {number|null} expireTime - 过期时间（毫秒），如果不传则不过期
   * @returns {boolean} - 是否设置成功
   */
  set(key, value, expireTime = null) {
    try {
      const data = {
        value,
        expireAt: expireTime ? Date.now() + expireTime : null
      };
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`StorageManager set() 失败，key: ${key}`, error);
      return false;
    }
  }

  /**
   * 获取存储
   * @param {string} key - 键名
   * @returns {any|null} - 对应的值，如果不存在或已过期则返回 null
   */
  get(key) {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) {
        return null;
      }

      const item = JSON.parse(itemStr);

      // 检查是否过期
      if (item.expireAt && Date.now() > item.expireAt) {
        this.remove(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error(`StorageManager get() 失败，key: ${key}`, error);
      return null;
    }
  }

  /**
   * 移除特定存储
   * @param {string} key - 键名
   * @returns {boolean} - 是否移除成功
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`StorageManager remove() 失败，key: ${key}`, error);
      return false;
    }
  }

  /**
   * 清空所有存储
   * @returns {boolean} - 是否清空成功
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('StorageManager clear() 失败', error);
      return false;
    }
  }
}
