import StockItem from '../models/StockItem.js';

const generateSerial = async () => {
  const items = await StockItem.find().select('serial').lean();
  const highestSerial = items.reduce((max, item) => {
    const match = String(item.serial || '').match(/(\d+)$/);
    const serialNumber = match ? Number(match[1]) : 0;
    return serialNumber > max ? serialNumber : max;
  }, 0);

  return `SJI-${String(highestSerial + 1).padStart(3, '0')}`;
};

// CREATE
export const createStock = async (req, res) => {
  try {
    const serial = await generateSerial();
    const stock = new StockItem({ ...req.body, serial });
    await stock.save();
    res.status(201).json({ success: true, data: stock });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// READ ALL
export const getAllStock = async (req, res) => {
  try {
    const { category, status } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (status)   filter.status   = status;
    const stock = await StockItem.find(filter)
      .populate('supplier', 'name contact')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: stock.length, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ ONE
export const getStockById = async (req, res) => {
  try {
    const stock = await StockItem.findById(req.params.id)
      .populate('supplier', 'name contact email');
    if (!stock) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// LOW STOCK ALERTS
export const getLowStockAlerts = async (req, res) => {
  try {
    const items = await StockItem.find({
      status: { $in: ['Low Stock', 'Out of Stock'] }
    }).populate('supplier', 'name contact');
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE
export const updateStock = async (req, res) => {
  try {
    const stock = await StockItem.findByIdAndUpdate(
      req.params.id, req.body,
      { new: true, runValidators: true }
    );
    if (!stock) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: stock });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE
export const deleteStock = async (req, res) => {
  try {
    const stock = await StockItem.findByIdAndDelete(req.params.id);
    if (!stock) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, message: 'Stock item removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};