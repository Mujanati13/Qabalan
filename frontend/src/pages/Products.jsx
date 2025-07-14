import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  InputNumber,
  Switch,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  SearchOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import { useLanguage } from "../contexts/LanguageContext";
import productsService from "../services/productsService";
import categoriesService from "../services/categoriesService";
const API_BASE_URL = import.meta.env.VITE_API_URL;

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Products = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Helper function to get the correct image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;

    // Check if it's already a full URL (starts with http:// or https://)
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }

    // Check if it's a data URL (base64)
    if (imagePath.startsWith("data:")) {
      return imagePath;
    }

    // Otherwise, it's a local file - prepend the API base URL
    return `${API_BASE_URL}/uploads/products/${imagePath}`;
  };

  // Load data
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Reload products when search text or category changes (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        loadProducts();
      },
      searchText ? 500 : 0
    ); // 500ms delay for search, immediate for category

    return () => clearTimeout(timeoutId);
  }, [searchText, selectedCategory, showInactive]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchText,
        category_id: selectedCategory || undefined, // Don't send empty string
        include_inactive: showInactive,
        page: 1,
        limit: 50,
      };

      // Remove undefined values
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      console.log("Loading products with params:", params);
      const response = await productsService.getProducts(params);
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load products"
      );
      // Fallback to mock data
      setProducts([
        {
          id: 1,
          title_en: "iPhone 15 Pro",
          title_ar: "آيفون 15 برو",
          description_en: "Latest iPhone with A17 Pro chip",
          description_ar: "أحدث آيفون بمعالج A17 برو",
          base_price: 999.99,
          sale_price: 899.99,
          stock_status: "in_stock",
          category_id: 1,
          category_title_en: "Electronics",
          is_active: true,
          is_featured: true,
          main_image: "iphone15pro.jpg",
          loyalty_points: 50,
          sku: "IP15PRO001",
          weight: 187,
          weight_unit: "g",
          slug: "iphone-15-pro",
          created_at: "2024-01-15T10:00:00Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesService.getCategories();
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setCategories([
        { id: 1, title_en: "Electronics", title_ar: "الإلكترونيات" },
        { id: 2, title_en: "Clothing", title_ar: "الملابس" },
      ]);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (product) => {
    console.log("Editing product:", product);
    console.log("Product category_id:", product.category_id);
    console.log("Available categories:", categories);

    // Find category_id based on category title if not present
    let categoryId = product.category_id;
    if (
      !categoryId &&
      (product.category_title_en || product.category_title_ar)
    ) {
      const matchingCategory = categories.find(
        (cat) =>
          cat.title_en === product.category_title_en ||
          cat.title_ar === product.category_title_ar ||
          cat.name === product.category_title_en
      );
      categoryId = matchingCategory?.id;
      console.log("Found category ID from title:", categoryId);
    }

    setEditingProduct(product);
    const formValues = {
      ...product,
      category_id: categoryId || product.category?.id,
      is_active: product.is_active === 1 || product.is_active === true,
      is_featured: product.is_featured === 1 || product.is_featured === true,
      images: product.images?.map((img, index) => ({
        uid: index,
        name: img,
        status: "done",
        url: `/uploads/products/${img}`,
      })),
    };

    console.log("Form values being set:", formValues);
    console.log("Final category_id:", formValues.category_id);
    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  const handleView = (product) => {
    setViewingProduct(product);
    setIsViewModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await productsService.deleteProduct(id);
      message.success(t("products.deleteSuccess"));
      loadProducts();
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          t("products.deleteError")
      );
    }
  };

  const handleSubmit = async (values) => {
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();

      // Add all form fields to FormData
      Object.keys(values).forEach((key) => {
        if (key === "main_image_file" && values[key]?.[0]?.originFileObj) {
          // Handle file upload
          formData.append("main_image", values[key][0].originFileObj);
        } else if (
          values[key] !== undefined &&
          values[key] !== null &&
          key !== "main_image_file"
        ) {
          formData.append(key, values[key]);
        }
      });

      if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, formData);
        message.success(t("products.updateSuccess"));
      } else {
        await productsService.createProduct(formData);
        message.success(t("products.createSuccess"));
      }
      setIsModalVisible(false);
      loadProducts();
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          t("products.saveError")
      );
    }
  };

  const toggleProductStatus = async (productId) => {
    try {
      await productsService.toggleProductStatus(productId);
      message.success(t("products.statusUpdated"));
      loadProducts();
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          t("products.statusUpdateError")
      );
    }
  };

  const filteredProducts = (Array.isArray(products) ? products : []).filter(
    (product) => {
      if (!product) return false;

      // Filter by active/inactive status if not using backend filtering
      if (
        !showInactive &&
        (product.is_active === 0 || product.is_active === false)
      ) {
        return false;
      }

      // Only do client-side search filtering since category filtering is handled by the API
      const matchesSearch =
        !searchText ||
        (product.title_en || product.name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        (product.title_ar || product.name_ar || "")
          .toLowerCase()
          .includes(searchText.toLowerCase());
      return matchesSearch;
    }
  );

  const columns = [
    {
      title: t("products.image"),
      dataIndex: "main_image",
      key: "main_image",
      width: 80,
      responsive: ["sm"],
      render: (image) => (
        <div
          style={{
            width: 60,
            height: 60,
            background: "#f5f5f5",
            borderRadius: 4,
          }}
        >
          {image ? (
            <img
              src={getImageUrl(image)}
              alt="Product"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 4,
              }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : null}
          <div
            style={{
              display: image ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#ccc",
            }}
          >
            <UploadOutlined />
          </div>
        </div>
      ),
    },
    {
      title: t("products.name"),
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (text, record) => {
        const nameEn =
          record.title_en || record.name || text || "Unnamed Product";
        const nameAr = record.title_ar || record.name_ar;

        return (
          <div>
            <div style={{ fontWeight: 500, wordBreak: "break-word" }}>
              {nameEn}
            </div>
            {nameAr && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  wordBreak: "break-word",
                }}
              >
                {nameAr}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t("products.category"),
      dataIndex: "category_name",
      key: "category_name",
      responsive: ["md"],
      ellipsis: true,
      render: (text, record) => {
        const categoryName =
          record.category_title_en ||
          record.category_name ||
          text ||
          "Uncategorized";
        return <span>{categoryName}</span>;
      },
    },
    {
      title: t("products.price"),
      dataIndex: "base_price",
      key: "base_price",
      render: (basePrice, record) => {
        const salePrice = record.sale_price;
        const finalPrice = salePrice || basePrice || 0;
        const hasDiscount = salePrice && salePrice < basePrice;

        return (
          <div>
            <div style={{ fontWeight: 500 }}>
              ${Number(finalPrice).toFixed(2)}
            </div>
            {hasDiscount && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#999",
                  textDecoration: "line-through",
                }}
              >
                ${Number(basePrice).toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t("products.loyaltyPoints"),
      dataIndex: "loyalty_points",
      key: "loyalty_points",
      responsive: ["lg"],
      render: (points) => (
        <Tag color="blue">
          {points || 0} {t("products.points")}
        </Tag>
      ),
    },
    {
      title: t("products.status"),
      dataIndex: "is_active",
      key: "is_active",
      responsive: ["md"],
      render: (isActive, record) => {
        const stockStatus = record.stock_status;

        if (stockStatus === "out_of_stock") {
          return <Tag color="red">{t("products.outOfStock")}</Tag>;
        }
        if (stockStatus === "limited") {
          return <Tag color="orange">{t("products.limitedStock")}</Tag>;
        }

        return (
          <Tag color={isActive ? "green" : "red"}>
            {isActive
              ? t("products.status_active")
              : t("products.status_inactive")}
          </Tag>
        );
      },
    },
    {
      title: t("products.featured"),
      dataIndex: "is_featured",
      key: "is_featured",
      responsive: ["lg"],
      render: (featured) =>
        featured ? <Tag color="gold">{t("products.featured")}</Tag> : null,
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title={t("common.view")}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title={t("common.edit")}>
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title={record.is_active ? t("common.deactivate") : t("common.activate")}>
            <Button
              type="text"
              icon={<PoweroffOutlined />}
              size="small"
              style={{ color: record.is_active ? "#ff4d4f" : "#52c41a" }}
              onClick={() => toggleProductStatus(record.id)}
            />
          </Tooltip>
          <Tooltip title={t("common.delete")}>
            <Popconfirm
              title={t("products.deleteConfirm")}
              onConfirm={() => handleDelete(record.id)}
              okText={t("common.yes")}
              cancelText={t("common.no")}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const uploadProps = {
    multiple: true,
    beforeUpload: () => false, // Prevent auto upload
    listType: "picture-card",
    maxCount: 5,
  };

  return (
    <div style={{ padding: "0 8px" }}>
      <Card
        style={{ borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        ></div>

        <Row gutter={[16, 16]} style={{ marginBottom: "16px" }}>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Input
              placeholder={t("products.search")}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="middle"
            />
          </Col>
          <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <Select
              placeholder={t("products.filterByCategory")}
              style={{ width: "100%" }}
              value={selectedCategory}
              onChange={setSelectedCategory}
              allowClear
              size="middle"
            >
              {(Array.isArray(categories) ? categories : []).map((category) => (
                <Option
                  key={category?.id || Math.random()}
                  value={category?.id ? category.id.toString() : ""}
                >
                  {category?.title_en || category?.name || "Unknown Category"}
                </Option>
              ))}
            </Select>
          </Col>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            size="middle"
          >
            {t("products.add")}
          </Button>
          {/* <Col xs={24} sm={24} md={12} lg={8} xl={6}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              height: '40px',
              gap: '8px',
              padding: '0 12px',
              // border: '1px solid #d9d9d9',
              borderRadius: '6px',
              background: '#fff'
            }}>
              <Switch 
                checked={showInactive}
                onChange={setShowInactive}
                size="small"
              />
              <Text style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
                {t('products.showInactive')}
              </Text>
            </div>
          </Col> */}
        </Row>

        <Table
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t("common.totalItems", { total }),
            responsive: true,
            showLessItems: true,
          }}
        />
      </Card>

      <Modal
        title={editingProduct ? t("products.edit") : t("products.add")}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width="90%"
        style={{ maxWidth: 800, top: 20 }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            weight_unit: "g",
            stock_status: "in_stock",
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="title_en"
                label={t("products.name")}
                rules={[
                  { required: true, message: t("products.nameRequired") },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="title_ar" label={t("products.nameAr")}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="description_en"
                label={t("products.description")}
              >
                <TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="description_ar"
                label={t("products.descriptionAr")}
              >
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="base_price"
                label={t("products.basePrice")}
                rules={[
                  { required: true, message: t("products.basePriceRequired") },
                ]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="sale_price" label={t("products.salePrice")}>
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: "100%" }}
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="loyalty_points"
                label={t("products.loyaltyPoints")}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="sku" label={t("products.sku")}>
                <Input placeholder={t("products.skuPlaceholder")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="weight" label={t("products.weight")}>
                <InputNumber min={0} precision={2} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="weight_unit" label={t("products.weightUnit")}>
                <Select>
                  <Option value="g">g</Option>
                  <Option value="kg">kg</Option>
                  <Option value="lb">lb</Option>
                  <Option value="oz">oz</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="category_id"
                label={t("products.category")}
                rules={[
                  { required: true, message: t("products.categoryRequired") },
                ]}
              >
                <Select>
                  {categories.map((category) => (
                    <Option key={category.id} value={category.id}>
                      {category.title_en || category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="stock_status"
                label={t("products.stockStatus")}
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="in_stock">{t("products.inStock")}</Option>
                  <Option value="out_of_stock">
                    {t("products.outOfStock")}
                  </Option>
                  <Option value="limited">{t("products.limitedStock")}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="is_featured"
                label={t("products.featured")}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={t("products.yes")}
                  unCheckedChildren={t("products.no")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="is_active"
                label={t("products.status")}
                rules={[{ required: true }]}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren={t("products.status_active")}
                  unCheckedChildren={t("products.status_inactive")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="slug" label={t("products.slug")}>
                <Input placeholder={t("products.slugPlaceholder")} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="main_image_file"
            label={t("products.mainImage")}
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
          >
            <Upload
              listType="picture-card"
              maxCount={1}
              beforeUpload={() => false} // Prevent auto upload
              accept="image/*"
              onPreview={async (file) => {
                let src = file.url;
                if (!src) {
                  src = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file.originFileObj);
                    reader.onload = () => resolve(reader.result);
                  });
                }
                const image = new Image();
                image.src = src;
                const imgWindow = window.open(src);
                imgWindow?.document.write(image.outerHTML);
              }}
            >
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>{t("products.uploadImage")}</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            name="main_image"
            label={t("products.imageUrl")}
            help={t("products.imageUrlHelp")}
          >
            <Input placeholder={t("products.imageUrlPlaceholder")} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="primary" htmlType="submit">
                {editingProduct ? t("common.update") : t("common.create")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("products.view")}
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsViewModalVisible(false)}>
            {t("common.close")}
          </Button>,
        ]}
        width="90%"
        style={{ maxWidth: 800, top: 20 }}
        destroyOnClose
      >
        {viewingProduct && (
          <div>
            <Row gutter={[16, 24]} style={{ marginBottom: "24px" }}>
              <Col xs={24} sm={8} md={8}>
                <div style={{ textAlign: "center" }}>
                  {viewingProduct.main_image ? (
                    <img
                      src={getImageUrl(viewingProduct.main_image)}
                      alt="Product"
                      style={{
                        width: "100%",
                        maxWidth: "200px",
                        height: "auto",
                        borderRadius: "8px",
                        border: "1px solid #f0f0f0",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: viewingProduct.main_image ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 200,
                      border: "1px solid #f0f0f0",
                      borderRadius: "8px",
                      color: "#ccc",
                    }}
                  >
                    <UploadOutlined style={{ fontSize: "48px" }} />
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={16} md={16}>
                <Title
                  level={3}
                  style={{
                    marginBottom: "16px",
                    fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
                  }}
                >
                  {viewingProduct.title_en ||
                    viewingProduct.name ||
                    "Unnamed Product"}
                </Title>
                {viewingProduct.title_ar && (
                  <Title
                    level={4}
                    style={{
                      color: "#666",
                      marginBottom: "16px",
                      fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
                    }}
                  >
                    {viewingProduct.title_ar}
                  </Title>
                )}

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.category")}: </Text>
                    <Text>
                      {viewingProduct.category_title_en ||
                        viewingProduct.category_name ||
                        "Uncategorized"}
                    </Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.sku")}: </Text>
                    <Text>{viewingProduct.sku || "N/A"}</Text>
                  </Col>
                </Row>

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.basePrice")}: </Text>
                    <Text>
                      ${Number(viewingProduct.base_price || 0).toFixed(2)}
                    </Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.salePrice")}: </Text>
                    <Text>
                      {viewingProduct.sale_price
                        ? `$${Number(viewingProduct.sale_price).toFixed(2)}`
                        : "N/A"}
                    </Text>
                  </Col>
                </Row>

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.loyaltyPoints")}: </Text>
                    <Tag color="blue">
                      {viewingProduct.loyalty_points || 0}{" "}
                      {t("products.points")}
                    </Tag>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.weight")}: </Text>
                    <Text>
                      {viewingProduct.weight
                        ? `${viewingProduct.weight} ${
                            viewingProduct.weight_unit || "g"
                          }`
                        : "N/A"}
                    </Text>
                  </Col>
                </Row>

                <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.status")}: </Text>
                    <Tag color={viewingProduct.is_active ? "green" : "red"}>
                      {viewingProduct.is_active
                        ? t("products.status_active")
                        : t("products.status_inactive")}
                    </Tag>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>{t("products.stockStatus")}: </Text>
                    <Tag
                      color={
                        viewingProduct.stock_status === "in_stock"
                          ? "green"
                          : viewingProduct.stock_status === "limited"
                          ? "orange"
                          : "red"
                      }
                    >
                      {viewingProduct.stock_status === "in_stock"
                        ? t("products.inStock")
                        : viewingProduct.stock_status === "limited"
                        ? t("products.limitedStock")
                        : t("products.outOfStock")}
                    </Tag>
                  </Col>
                </Row>

                {viewingProduct.is_featured && (
                  <Row gutter={[16, 12]} style={{ marginBottom: "12px" }}>
                    <Col span={24}>
                      <Tag color="gold">{t("products.featured")}</Tag>
                    </Col>
                  </Row>
                )}
              </Col>
            </Row>

            {(viewingProduct.description_en ||
              viewingProduct.description_ar) && (
              <div>
                <Title
                  level={4}
                  style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)" }}
                >
                  {t("products.description")}
                </Title>
                {viewingProduct.description_en && (
                  <div style={{ marginBottom: "12px" }}>
                    <Text strong>{t("products.english")}: </Text>
                    <Text>{viewingProduct.description_en}</Text>
                  </div>
                )}
                {viewingProduct.description_ar && (
                  <div>
                    <Text strong>{t("products.arabic")}: </Text>
                    <Text>{viewingProduct.description_ar}</Text>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Products;
